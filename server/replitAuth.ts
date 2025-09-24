import connectPg from "connect-pg-simple";
import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import memoize from "memoizee";
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    sessionId?: string;
    returnTo?: string;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: Express.User;
  }
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      organizationId?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

interface JwtPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "your-secret-key-here";
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key";
const JWT_EXPIRES_IN = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 1 week

if (!process.env.ISSUER_URL) {
  throw new Error("Environment variable ISSUER_URL not provided");
}

if (!process.env.CLIENT_ID) {
  throw new Error("Environment variable CLIENT_ID not provided");
}

if (!process.env.CLIENT_SECRET) {
  throw new Error("Environment variable CLIENT_SECRET not provided");
}

const getOidcConfig = memoize(
  async () => {
    const issuer = await client.discovery(
      new URL(process.env.ISSUER_URL!),
      process.env.CLIENT_ID!,
      process.env.CLIENT_SECRET
    );

    // return new issuer.Client({
    return new issuer[client].Client({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uris: [
        process.env.REDIRECT_URI || "http://localhost:3000/api/auth/callback",
      ],
      response_types: ["code"],
    });
  },
  { maxAge: 3600 * 1000 }
);

function generateJwtToken(userId: string, sessionId: string): string {
  return jwt.sign({ userId, sessionId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function verifyJwtToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: COOKIE_MAX_AGE / 1000, // Convert to seconds
    tableName: "sessions",
  });

  return session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: "sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
  });
}

async function updateUserSession(
  req: Request,
  user: Express.User,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
): Promise<string> {
  const claims = tokens.claims();

  if (!claims?.sub) {
    throw new Error("No subject claim in token");
  }

  // Update user session
  user.id = claims.sub;
  user.email = claims.email as string | undefined;
  user.firstName =
    (claims.given_name as string) || (claims.name as string)?.split(" ")[0];
  user.lastName =
    (claims.family_name as string) ||
    (claims.name as string)?.split(" ").slice(1).join(" ");
  user.role = (claims.role as string) || "user";
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = tokens.expires_in
    ? Math.floor(Date.now() / 1000) + tokens.expires_in
    : undefined;

  // Create or update user in database
  await storage.upsertUser({
    id: claims.sub,
    email: claims.email as string,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    profileImageUrl: claims.picture as string | undefined,
    role: user.role as any,
    organizationId: user.organizationId,
  });

  // Generate JWT token
  const sessionId = uuidv4();
  const token = generateJwtToken(user.id, sessionId);

  // Store session ID in the user's session
  req.session!.sessionId = sessionId;

  return token;
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token) {
    // Verify JWT token
    const decoded = verifyJwtToken(token);
    if (decoded && decoded.userId) {
      const user = await storage.getUser(decoded.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }

  // Fallback to session-based authentication
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
};

// Middleware to check if user has required role
export const hasRole = (roles: string | string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userRoles = [req.user.role || "user"];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!requiredRoles.some((role) => userRoles.includes(role))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
};

export async function setupAuth(app: Express) {
  // Trust first proxy (for secure cookies behind proxy)
  app.set("trust proxy", 1);

  // Session middleware
  app.use(getSession());

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Get OIDC client
  const client = await getOidcConfig();

  // Configure Passport with OpenID Connect strategy
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse,
    _issuer: any, // This is actually the verify callback, not the issuer
    profile: any,
    done: (error: any, user?: Express.User | false, info?: any) => void
  ) => {
    try {
      const req = _issuer as Request; // The first parameter is actually the request
      const user: Express.User = { id: profile.sub };
      const token = await updateUserSession(
        req,
        user,
        tokens as client.TokenEndpointResponse &
          client.TokenEndpointResponseHelpers
      );

      // Set JWT token as a cookie
      req.res?.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  };

  // Configure Passport strategy
  const strategy = new Strategy(
    {
      client,
      params: {
        scope: "openid email profile offline_access",
      },
      usePKCE: true,
    },
    verify
  );

  passport.use("oidc", strategy);

  // Serialize and deserialize user
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  passport.deserializeUser(async (user: Express.User, done) => {
    try {
      const dbUser = await storage.getUser(user.id);
      done(null, dbUser || user);
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.get("/api/auth/login", (req: Request, res: Response) => {
    const returnTo =
      typeof req.query.returnTo === "string" ? req.query.returnTo : "/";
    const authUrl = client.authorizationUrl({
      scope: "openid email profile offline_access",
      state: returnTo,
      prompt: "login consent",
    });
    res.redirect(authUrl);
  });

  app.get(
    "/api/auth/callback",
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate("oidc", {
        successReturnToOrRedirect: "/",
        failureRedirect: "/login?error=auth_failed",
        session: true,
      })(req, res, next);
    }
  );

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      const tokenSet = await client.refresh(refreshToken);
      const user = req.user as Express.User | undefined;

      if (user) {
        const token = await updateUserSession(
          req,
          user,
          tokenSet as client.TokenEndpointResponse &
            client.TokenEndpointResponseHelpers
        );
        return res.json({ token });
      }

      res.status(401).json({ error: "User not authenticated" });
    } catch (error) {
      console.error("Error refreshing token:", error);
      res.status(401).json({ error: "Invalid refresh token" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      // Clear session
      req.session?.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        // Clear cookies
        res.clearCookie("connect.sid");
        res.clearCookie("token");

        // Redirect to OIDC logout endpoint
        const host = req.get("host");
        const protocol = req.protocol;

        if (host) {
          const logoutUrl = client.endSessionUrl({
            post_logout_redirect_uri: `${protocol}://${host}/`,
          });
          return res.redirect(logoutUrl);
        }

        // Fallback if host header is not available
        res.redirect("/");
      });
    });
  });

  // User info endpoint
  app.get("/api/auth/me", isAuthenticated, (req: Request, res: Response) => {
    const { id, email, firstName, lastName, role, organizationId } =
      req.user as Express.User;
    res.json({
      id,
      email,
      firstName,
      lastName,
      role,
      organizationId,
    });
  });
}

// This is a duplicate declaration that was removed

// const now = Math.floor(Date.now() / 1000);
// if (now <= user.expires_at) {
//   return next();
// }

// const refreshToken = user.refresh_token;
// if (!refreshToken) {
//   res.status(401).json({ message: "Unauthorized" });
//   return;
// }

// try {
//   const config = await getOidcConfig();
//   const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
//   updateUserSession(user, tokenResponse);
//   return next();
// } catch (error) {
//   res.status(401).json({ message: "Unauthorized" });
//   return;
// }
