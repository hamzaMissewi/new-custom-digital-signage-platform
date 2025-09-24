import {
  ClerkExpressRequireAuth,
  ClerkExpressWithAuth,
  ClerkMiddlewareOptions,
  LooseAuthProp,
  WithAuthProp,
  Clerk,
} from "@clerk/clerk-sdk-node";
import express, { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";
import jwt from 'jsonwebtoken';
import { zfd } from 'zod-form-data';

// Extend Express types
declare global {
  namespace Express {
    interface Request extends LooseAuthProp {}
  }
}

// JWT Secret - in production, use a proper secret management solution
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const JWT_EXPIRES_IN = '7d';

// JWT Token interface
interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Initialize Clerk
const clerk = new Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Auth schemas
const SignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// Middleware to attach user to request
export const attachUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const sessionToken = authHeader.replace("Bearer ", "");
      if (sessionToken) {
        // In a real implementation, you would verify the session token with Clerk
        // For now, we'll just pass through and let the requireAuth middleware handle it
        next();
        return;
      }
    }
    next();
  } catch (error) {
    console.error("Error in attachUser middleware:", error);
    next(error);
  }
};

// JWT Middleware
export const jwtAuth: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Attach user to request
    req.auth = {
      userId: decoded.userId,
      sessionId: '', // Not used in JWT flow
      getToken: async () => token,
      claims: {
        sub: decoded.userId,
        email: decoded.email,
        role: decoded.role
      }
    };
    
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Clerk Middleware
export const clerkAuth = ClerkExpressRequireAuth();
export const optionalClerkAuth = ClerkExpressWithAuth();

// Role-based access control middleware
export const requireRole = (roles: string | string[]) => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  
  return [
    clerkAuth,
    async (req: WithAuthProp<Request>, res: Response, next: NextFunction) => {
      try {
        const userRole = req.auth?.claims?.role;
        
        if (!userRole || !roleList.includes(userRole)) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
        
        next();
      } catch (error) {
        console.error('Role check failed:', error);
        next(error);
      }
    }
  ];
};

// Auth Routes
export const setupAuthRoutes = (app: express.Express) => {
  // JWT Login
  app.post('/api/auth/jwt/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // In a real app, verify credentials against your database
      // This is a simplified example
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      // Mock user - replace with actual database lookup
      const user = { id: '1', email, role: 'user' };
      
      // Create token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.json({ token, user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Clerk Session Check
  app.get('/api/auth/clerk/session', clerkAuth, (req: WithAuthProp<Request>, res) => {
    try {
      res.json({
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        claims: req.auth.claims,
      });
    } catch (error) {
      console.error('Session check failed:', error);
      res.status(500).json({ message: 'Session check failed' });
    }
  });

  // JWT Session Check
  app.get('/api/auth/jwt/session', jwtAuth, (req, res) => {
    try {
      res.json({
        userId: req.auth?.userId,
        claims: req.auth?.claims,
      });
    } catch (error) {
      console.error('Session check failed:', error);
      res.status(500).json({ message: 'Session check failed' });
    }
  });

  // Logout (for JWT, client should discard the token)
  app.post('/api/auth/logout', (req, res) => {
    // For JWT, logout is handled client-side by removing the token
    // For Clerk, the client should call Clerk's signOut()

try{
      // res.json({ message: 'Logout successful' });
        // For now, we'll just check if the user is authenticated
        if (!req.auth?.userId) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        next();
      } catch (error) {
        console.error("Error in requireRole middleware:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  ];
};

// Setup authentication routes and middleware
export const setupAuth = (app: express.Express) => {
  // Add user attachment middleware
  app.use(attachUser);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", auth: !!req.auth });
  });

  // Example protected route
  app.get("/api/protected", requireAuth, (req, res) => {
    res.json({
      message: "This is a protected route",
      userId: req.auth?.userId,
    });
  });

  // Example admin route
  // app.get("/api/admin", requireRole("admin"), (req, res) => {
  //   res.json({ message: "Admin access granted" });
  // });

  // Error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Auth error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message || "Authentication error",
      });
    }
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });
};
