import {
  ClerkExpressRequireAuth,
  ClerkExpressWithAuth,
} from "@clerk/clerk-sdk-node";
import { Request, Response, NextFunction } from "express";

// Extend Express Request type to include Clerk's auth
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        getToken: () => Promise<string | null>;
      };
    }
  }
}

// Middleware to require authentication
export const requireAuth = ClerkExpressRequireAuth();

// Middleware for optional authentication
export const optionalAuth = ClerkExpressWithAuth();

// Role-based access control middleware
export const requireRole = (roles: string | string[]) => {
  const rolesArray = Array.isArray(roles) ? roles : [roles];

  return [
    ClerkExpressRequireAuth(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // In a real implementation, you would check the user's role
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

// Health check endpoint
export const healthCheck = (req: Request, res: Response): void => {
  res.json({
    status: "ok",
    authenticated: !!(req as any).auth?.userId,
  });
};

// Error handling middleware
export const errorHandler = (
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Auth error:", err);
  if ((err as any).statusCode) {
    res.status((err as any).statusCode).json({
      error: err.message || "Authentication error",
    });
    return;
  }
  res.status(500).json({
    error: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { details: err.message }),
  });
};
