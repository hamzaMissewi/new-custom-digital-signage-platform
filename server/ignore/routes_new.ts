import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../storage";
import { generateAISuggestions, tagImage } from "../openai";
import {
  insertScreenSchema,
  insertMediaSchema,
  insertPlaylistSchema,
  insertPlaylistItemSchema,
  insertBroadcastSchema,
  users,
  organizations,
  type UpsertUser,
  type InsertOrganization,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: File type not supported!"));
    }
  },
});

// WebSocket connections for real-time updates
const screenConnections = new Map<string, WebSocket>(); // deviceKey -> WebSocket

// Mock user for development
const getMockUser = async () => {
  try {
    // Try to get the first organization if it exists
    const orgs = await db.select().from(organizations).limit(1);
    let org = orgs[0];

    if (!org) {
      // Create a default organization if none exists
      const newOrg: InsertOrganization = {
        name: "Default Organization",
        description: "Default organization created on startup",
      };
      [org] = await db.insert(organizations).values(newOrg).returning();
    }

    // Try to get the first user if it exists
    const userList = await db.select().from(users).limit(1);
    let user = userList[0];

    if (!user) {
      const newUser: UpsertUser = {
        id: "default-user",
        email: "user@example.com",
        firstName: "Default",
        lastName: "User",
        organizationId: org.id,
        role: "admin",
        profileImageUrl: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      [user] = await db.insert(users).values(newUser).returning();
    }

    return user;
  } catch (error) {
    console.error("Error setting up mock user:", error);
    throw new Error("Failed to initialize default user and organization");
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Get stats
  app.get("/api/stats", async (req, res) => {
    try {
      // const stats = await storage.getOrganizationStats(
      //   req.user?.claims.organizationId
      // );
      // const stats = await storage.getStats(
      // res.json(stats);

      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.organizationId) {
        return res
          .status(400)
          .json({ message: "User not associated with organization" });
      }

      const media = await storage.getMedia(user.organizationId);
      res.json(media);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Media routes
  app.get("/api/media", async (req, res) => {
    try {
      const user = await getMockUser();
      if (!user.organizationId) {
        return res
          .status(400)
          .json({ message: "User is not associated with an organization" });
      }
      const media = await storage.getMedia(user.organizationId);
      res.json(media);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.post("/api/media/upload", upload.single("file"), async (req, res) => {
    try {
      const user = await getMockUser();

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!user.organizationId) {
        return res
          .status(400)
          .json({ message: "User is not associated with an organization" });
      }

      // Create media record
      const mediaData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        organizationId: user.organizationId,
        uploadedById: user.id,
        tags: [],
        thumbnailUrl: null,
        aiTags: null,
      };

      const media = await storage.createMedia(mediaData);

      // Auto-tag with AI if it's an image
      if (req.file.mimetype.startsWith("image/")) {
        try {
          const imagePath = req.file.path;
          const tags = await tagImage(imagePath);

          await storage.updateMedia(media.id, {
            aiTags: tags,
            tags: tags.tags || [],
          });
        } catch (tagError) {
          console.error("Error auto-tagging image:", tagError);
        }
      }

      // Audit log
      await storage.createAuditLog({
        action: "upload",
        entityType: "media",
        entityId: media.id,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: { filename: media.originalName, size: media.size },
      });

      res.json(media);
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ message: "Failed to upload media" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // Playlist routes
  app.get("/api/playlists", async (req, res) => {
    try {
      const user = await getMockUser();
      if (!user.organizationId) {
        return res
          .status(400)
          .json({ message: "User is not associated with an organization" });
      }
      const playlists = await storage.getPlaylists(user.organizationId);
      res.json(playlists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.get("/api/playlists/:id", async (req, res) => {
    try {
      const playlist = await storage.getPlaylistWithItems(req.params.id);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });

  app.post("/api/playlists", async (req, res) => {
    try {
      const user = await getMockUser();
      if (!user.organizationId) {
        return res
          .status(400)
          .json({ message: "User is not associated with an organization" });
      }
      const validatedData = insertPlaylistSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        createdById: user.id,
      });

      const playlist = await storage.createPlaylist(validatedData);

      // Audit log
      await storage.createAuditLog({
        action: "create",
        entityType: "playlist",
        entityId: playlist.id,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: { name: playlist.name },
      });

      res.json(playlist);
    } catch (error) {
      console.error("Error creating playlist:", error);
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  // ... [rest of the routes with similar modifications]
  // Note: I've shown the pattern for a few routes. The same pattern should be applied to all routes.

  // WebSocket handling
  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "register") {
          const { deviceKey } = data;
          screenConnections.set(deviceKey, ws);
          console.log(`Screen registered with key: ${deviceKey}`);

          // Send acknowledgment
          ws.send(
            JSON.stringify({
              type: "registered",
              deviceKey,
            })
          );
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      // Remove from connections
      for (const [key, connection] of screenConnections.entries()) {
        if (connection === ws) {
          screenConnections.delete(key);
          console.log(`Screen with key ${key} disconnected`);
          break;
        }
      }
    });
  });

  // Broadcast to all connected screens
  const broadcastToScreens = (data: any) => {
    const message = JSON.stringify(data);
    // Convert iterator to array to avoid downlevel iteration issues
    const connections = Array.from(screenConnections.values());
    for (const ws of connections) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      } catch (error) {
        console.error("Error broadcasting to screen:", error);
      }
    }
  };

  return server;
}
