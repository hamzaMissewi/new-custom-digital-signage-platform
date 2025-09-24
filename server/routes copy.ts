import type { Express } from "express";
import express from "express";
import fs from "fs";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";

// Store active WebSocket connections for screens
const screenConnections = new Map<string, WebSocket>();

// Authentication removed
import {
  insertBroadcastSchema,
  insertPlaylistItemSchema,
  insertPlaylistSchema,
} from "@shared/schema";
import { generateAISuggestions, tagImage } from "./openai";
import { isAuthenticated } from "./replitAuth";

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
export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication removed

  // Auth routes
  // Authentication routes removed

  app.get("/api/stats", async (req: any, res) => {
    // All routes are now public, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.organizationId) {
        return res
          .status(400)
          .json({ message: "User not associated with organization" });
      }

      const media = await storage.getMedia(user.organizationId);
      res.json(media);
    } catch (error) {
      // console.error("Error updating screen:", error);
      // res.status(500).json({ message: "Failed to update screen" });
      console.error("Error fetching media:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.post(
    "/api/media/upload",
    isAuthenticated,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user?.organizationId) {
          return res
            .status(400)
            .json({ message: "User not associated with organization" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
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
    }
  );

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // Playlist routes
  app.get("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.organizationId) {
        return res
          .status(400)
          .json({ message: "User not associated with organization" });
      }

      const playlists = await storage.getPlaylists(user.organizationId);
      res.json(playlists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.organizationId) {
        return res
          .status(400)
          .json({ message: "User not associated with organization" });
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

  app.post(
    "/api/playlists/:id/items",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user?.organizationId) {
          return res
            .status(400)
            .json({ message: "User not associated with organization" });
        }

        const validatedData = insertPlaylistItemSchema.parse({
          ...req.body,
          playlistId: req.params.id,
        });

        const item = await storage.addPlaylistItem(validatedData);
        res.json(item);
      } catch (error) {
        console.error("Error adding playlist item:", error);
        res.status(500).json({ message: "Failed to add playlist item" });
      }
    }
  );

  // AI suggestions route
  app.post("/api/ai/suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.organizationId) {
        return res
          .status(400)
          .json({ message: "User not associated with organization" });
      }

      const { context, timeOfDay, audienceType } = req.body;
      const suggestions = await generateAISuggestions(
        context,
        timeOfDay,
        audienceType
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  // Broadcast routes
  app.post("/api/broadcasts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.organizationId) {
        return res
          .status(400)
          .json({ message: "User not associated with organization" });
      }

      const validatedData = insertBroadcastSchema.parse({
        ...req.body,
        organizationId: user.organizationId,
        createdById: user.id,
      });

      const broadcast = await storage.createBroadcast(validatedData);

      // Get playlist data
      const playlist = await storage.getPlaylistWithItems(
        validatedData.playlistId
      );
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Send to connected screens
      const message = JSON.stringify({
        type: "LOAD_PLAYLIST",
        payload: {
          playlist,
          broadcastId: broadcast.id,
        },
      });

      validatedData.screenIds.forEach((screenId) => {
        const screen = screenConnections.get(screenId);
        if (screen && screen.readyState === WebSocket.OPEN) {
          screen.send(message);
        }
      });

      // Update broadcast status
      await storage.updateBroadcast(broadcast.id, {
        status: "broadcasting",
        startedAt: new Date(),
      });

      // Audit log
      await storage.createAuditLog({
        action: "broadcast",
        entityType: "playlist",
        entityId: validatedData.playlistId,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: {
          broadcastId: broadcast.id,
          screenIds: validatedData.screenIds,
          playlistName: playlist.name,
        },
      });

      res.json(broadcast);
    } catch (error) {
      console.error("Error creating broadcast:", error);
      res.status(500).json({ message: "Failed to create broadcast" });
    }
  });

  // Player connection route
  app.post("/api/player/connect", async (req, res) => {
    try {
      const { deviceKey } = req.body;
      if (!deviceKey) {
        return res.status(400).json({ message: "Device key required" });
      }

      const screen = await storage.getScreenByDeviceKey(deviceKey);
      if (!screen) {
        return res.status(404).json({ message: "Screen not found" });
      }

      await storage.updateScreenOnlineStatus(deviceKey, true);

      // Get current playlist if assigned
      let currentPlaylist = null;
      if (screen.currentPlaylistId) {
        currentPlaylist = await storage.getPlaylistWithItems(
          screen.currentPlaylistId
        );
      }

      res.json({
        screen,
        currentPlaylist,
        message: "Connected successfully",
      });
    } catch (error) {
      console.error("Error connecting player:", error);
      res.status(500).json({ message: "Failed to connect player" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time player communication
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection");

    // Handle new screen connection
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "REGISTER_SCREEN" && data.screenId) {
          // Store the WebSocket connection with screenId as the key
          screenConnections.set(data.screenId, ws);
          console.log(`Screen connected: ${data.screenId}`);

          // Handle connection close
          ws.on("close", () => {
            screenConnections.delete(data.screenId);
            console.log(`Screen disconnected: ${data.screenId}`);
          });
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "PLAYER_REGISTER") {
          const { deviceKey } = data.payload;
          if (deviceKey) {
            screenConnections.set(deviceKey, ws);
            await storage.updateScreenOnlineStatus(deviceKey, true);
            console.log(`Player registered: ${deviceKey}`);
          }
        } else if (data.type === "PLAYER_STATUS") {
          // Handle player status updates
          const { deviceKey, status } = data.payload;
          console.log(`Player ${deviceKey} status:`, status);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      // Remove connection and update status
      for (const [deviceKey, connection] of Array.from(
        screenConnections.entries()
      )) {
        if (connection === ws) {
          screenConnections.delete(deviceKey);
          storage.updateScreenOnlineStatus(deviceKey, false);
          console.log(`Player disconnected: ${deviceKey}`);
          break;
        }
      }
    });
  });

  return httpServer;
}
