import express, {
  type Request,
  type Response,
  type NextFunction,
  type Express,
} from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { healthCheck, errorHandler } from "./middleware/auth";
import { clerkAuth, setupAuthRoutes } from "./clerkAuth";

// Initialize environment variables
require("dotenv").config();

const app: Express = express();

// Trust proxy for production
app.set("trust proxy", true);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get("/api/health", healthCheck);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson: unknown) {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson(bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 77)}...`;
      }

      log(logLine);
    }
  });

  next();
});

// Main application setup
const startServer = async () => {
  try {
    // Register API routes
    const server = await registerRoutes(app);

    // Setup authentication routes
    setupAuthRoutes(app);

    // Apply Clerk authentication to all API routes except health check and auth endpoints
    app.use("/api", (req: Request, res: Response, next: NextFunction) => {
      // Skip auth for health check and auth endpoints
      const publicPaths = ["/health", "/auth"];
      if (publicPaths.some((path) => req.path.startsWith(path))) {
        return next();
      }
      return clerkAuth(req, res, next);
    });

    // Error handling middleware
    app.use(errorHandler);

    // Setup Vite in development mode
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "0.0.0.0", () => {
      log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
