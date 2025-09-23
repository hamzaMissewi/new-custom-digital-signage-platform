import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "editor", "viewer"] }).default("viewer"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const screens = pgTable("screens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  location: varchar("location"),
  deviceKey: varchar("device_key").unique().notNull(),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  currentPlaylistId: varchar("current_playlist_id").references(() => playlists.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const media = pgTable("media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  url: varchar("url").notNull(),
  thumbnailUrl: varchar("thumbnail_url"),
  tags: text("tags").array(),
  aiTags: jsonb("ai_tags"),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  uploadedById: varchar("uploaded_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playlistItems = pgTable("playlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").references(() => playlists.id).notNull(),
  mediaId: varchar("media_id").references(() => media.id).notNull(),
  order: integer("order").notNull(),
  duration: integer("duration").default(10), // seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  playlistId: varchar("playlist_id").references(() => playlists.id).notNull(),
  screenIds: text("screen_ids").array(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  daysOfWeek: integer("days_of_week").array(), // 0=Sunday, 1=Monday, etc.
  isActive: boolean("is_active").default(true),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const broadcasts = pgTable("broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").references(() => playlists.id).notNull(),
  screenIds: text("screen_ids").array().notNull(),
  status: varchar("status", { enum: ["pending", "broadcasting", "completed", "failed"] }).default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  createdById: varchar("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  screens: many(screens),
  media: many(media),
  playlists: many(playlists),
  schedules: many(schedules),
  broadcasts: many(broadcasts),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  uploadedMedia: many(media),
  createdPlaylists: many(playlists),
  createdBroadcasts: many(broadcasts),
  auditLogs: many(auditLogs),
}));

export const screensRelations = relations(screens, ({ one }) => ({
  organization: one(organizations, {
    fields: [screens.organizationId],
    references: [organizations.id],
  }),
  currentPlaylist: one(playlists, {
    fields: [screens.currentPlaylistId],
    references: [playlists.id],
  }),
}));

export const mediaRelations = relations(media, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [media.organizationId],
    references: [organizations.id],
  }),
  uploadedBy: one(users, {
    fields: [media.uploadedById],
    references: [users.id],
  }),
  playlistItems: many(playlistItems),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [playlists.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [playlists.createdById],
    references: [users.id],
  }),
  items: many(playlistItems),
  schedules: many(schedules),
  broadcasts: many(broadcasts),
  screens: many(screens),
}));

export const playlistItemsRelations = relations(playlistItems, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistItems.playlistId],
    references: [playlists.id],
  }),
  media: one(media, {
    fields: [playlistItems.mediaId],
    references: [media.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  playlist: one(playlists, {
    fields: [schedules.playlistId],
    references: [playlists.id],
  }),
  organization: one(organizations, {
    fields: [schedules.organizationId],
    references: [organizations.id],
  }),
}));

export const broadcastsRelations = relations(broadcasts, ({ one }) => ({
  playlist: one(playlists, {
    fields: [broadcasts.playlistId],
    references: [playlists.id],
  }),
  organization: one(organizations, {
    fields: [broadcasts.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [broadcasts.createdById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScreenSchema = createInsertSchema(screens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Screen = typeof screens.$inferSelect;
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
