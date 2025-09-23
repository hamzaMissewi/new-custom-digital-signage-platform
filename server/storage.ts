import {
  users,
  organizations,
  screens,
  media,
  playlists,
  playlistItems,
  schedules,
  broadcasts,
  auditLogs,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Screen,
  type InsertScreen,
  type Media,
  type InsertMedia,
  type Playlist,
  type InsertPlaylist,
  type PlaylistItem,
  type InsertPlaylistItem,
  type Schedule,
  type InsertSchedule,
  type Broadcast,
  type InsertBroadcast,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  getOrganizationsByUser(userId: string): Promise<Organization[]>;

  // Screen operations
  getScreens(organizationId: string): Promise<Screen[]>;
  getScreen(id: string): Promise<Screen | undefined>;
  getScreenByDeviceKey(deviceKey: string): Promise<Screen | undefined>;
  createScreen(screen: InsertScreen): Promise<Screen>;
  updateScreen(id: string, updates: Partial<InsertScreen>): Promise<Screen>;
  updateScreenOnlineStatus(deviceKey: string, isOnline: boolean): Promise<void>;

  // Media operations
  getMedia(organizationId: string): Promise<Media[]>;
  getMediaItem(id: string): Promise<Media | undefined>;
  createMedia(mediaData: InsertMedia): Promise<Media>;
  updateMedia(id: string, updates: Partial<InsertMedia>): Promise<Media>;
  deleteMedia(id: string): Promise<void>;

  // Playlist operations
  getPlaylists(organizationId: string): Promise<Playlist[]>;
  getPlaylist(id: string): Promise<Playlist | undefined>;
  getPlaylistWithItems(id: string): Promise<(Playlist & { items: (PlaylistItem & { media: Media })[] }) | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: string, updates: Partial<InsertPlaylist>): Promise<Playlist>;
  deletePlaylist(id: string): Promise<void>;

  // Playlist item operations
  addPlaylistItem(item: InsertPlaylistItem): Promise<PlaylistItem>;
  removePlaylistItem(id: string): Promise<void>;
  updatePlaylistItemOrder(playlistId: string, items: { id: string; order: number }[]): Promise<void>;

  // Schedule operations
  getSchedules(organizationId: string): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, updates: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: string): Promise<void>;

  // Broadcast operations
  getBroadcasts(organizationId: string): Promise<Broadcast[]>;
  createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast>;
  updateBroadcast(id: string, updates: Partial<InsertBroadcast>): Promise<Broadcast>;

  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(organizationId: string): Promise<AuditLog[]>;

  // Stats operations
  getOrganizationStats(organizationId: string): Promise<{
    activeScreens: number;
    mediaAssets: number;
    activePlaylists: number;
    recentActivity: AuditLog[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [newOrg] = await db.insert(organizations).values(organization).returning();
    return newOrg;
  }

  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const user = await this.getUser(userId);
    if (!user?.organizationId) return [];
    
    const org = await this.getOrganization(user.organizationId);
    return org ? [org] : [];
  }

  // Screen operations
  async getScreens(organizationId: string): Promise<Screen[]> {
    return await db.select().from(screens)
      .where(eq(screens.organizationId, organizationId))
      .orderBy(asc(screens.name));
  }

  async getScreen(id: string): Promise<Screen | undefined> {
    const [screen] = await db.select().from(screens).where(eq(screens.id, id));
    return screen;
  }

  async getScreenByDeviceKey(deviceKey: string): Promise<Screen | undefined> {
    const [screen] = await db.select().from(screens).where(eq(screens.deviceKey, deviceKey));
    return screen;
  }

  async createScreen(screen: InsertScreen): Promise<Screen> {
    const [newScreen] = await db.insert(screens).values(screen).returning();
    return newScreen;
  }

  async updateScreen(id: string, updates: Partial<InsertScreen>): Promise<Screen> {
    const [updatedScreen] = await db
      .update(screens)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(screens.id, id))
      .returning();
    return updatedScreen;
  }

  async updateScreenOnlineStatus(deviceKey: string, isOnline: boolean): Promise<void> {
    await db
      .update(screens)
      .set({ 
        isOnline, 
        lastSeen: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(screens.deviceKey, deviceKey));
  }

  // Media operations
  async getMedia(organizationId: string): Promise<Media[]> {
    return await db.select().from(media)
      .where(eq(media.organizationId, organizationId))
      .orderBy(desc(media.createdAt));
  }

  async getMediaItem(id: string): Promise<Media | undefined> {
    const [mediaItem] = await db.select().from(media).where(eq(media.id, id));
    return mediaItem;
  }

  async createMedia(mediaData: InsertMedia): Promise<Media> {
    const [newMedia] = await db.insert(media).values(mediaData).returning();
    return newMedia;
  }

  async updateMedia(id: string, updates: Partial<InsertMedia>): Promise<Media> {
    const [updatedMedia] = await db
      .update(media)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(media.id, id))
      .returning();
    return updatedMedia;
  }

  async deleteMedia(id: string): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }

  // Playlist operations
  async getPlaylists(organizationId: string): Promise<Playlist[]> {
    return await db.select().from(playlists)
      .where(eq(playlists.organizationId, organizationId))
      .orderBy(desc(playlists.createdAt));
  }

  async getPlaylist(id: string): Promise<Playlist | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
    return playlist;
  }

  async getPlaylistWithItems(id: string): Promise<(Playlist & { items: (PlaylistItem & { media: Media })[] }) | undefined> {
    const playlist = await this.getPlaylist(id);
    if (!playlist) return undefined;

    const items = await db
      .select({
        id: playlistItems.id,
        playlistId: playlistItems.playlistId,
        mediaId: playlistItems.mediaId,
        order: playlistItems.order,
        duration: playlistItems.duration,
        createdAt: playlistItems.createdAt,
        media: media,
      })
      .from(playlistItems)
      .leftJoin(media, eq(playlistItems.mediaId, media.id))
      .where(eq(playlistItems.playlistId, id))
      .orderBy(asc(playlistItems.order));

    return {
      ...playlist,
      items: items.map(item => ({
        id: item.id,
        playlistId: item.playlistId,
        mediaId: item.mediaId,
        order: item.order,
        duration: item.duration,
        createdAt: item.createdAt,
        media: item.media!,
      })),
    };
  }

  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const [newPlaylist] = await db.insert(playlists).values(playlist).returning();
    return newPlaylist;
  }

  async updatePlaylist(id: string, updates: Partial<InsertPlaylist>): Promise<Playlist> {
    const [updatedPlaylist] = await db
      .update(playlists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(playlists.id, id))
      .returning();
    return updatedPlaylist;
  }

  async deletePlaylist(id: string): Promise<void> {
    await db.delete(playlistItems).where(eq(playlistItems.playlistId, id));
    await db.delete(playlists).where(eq(playlists.id, id));
  }

  // Playlist item operations
  async addPlaylistItem(item: InsertPlaylistItem): Promise<PlaylistItem> {
    const [newItem] = await db.insert(playlistItems).values(item).returning();
    return newItem;
  }

  async removePlaylistItem(id: string): Promise<void> {
    await db.delete(playlistItems).where(eq(playlistItems.id, id));
  }

  async updatePlaylistItemOrder(playlistId: string, items: { id: string; order: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(playlistItems)
        .set({ order: item.order })
        .where(and(eq(playlistItems.id, item.id), eq(playlistItems.playlistId, playlistId)));
    }
  }

  // Schedule operations
  async getSchedules(organizationId: string): Promise<Schedule[]> {
    return await db.select().from(schedules)
      .where(eq(schedules.organizationId, organizationId))
      .orderBy(desc(schedules.createdAt));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async updateSchedule(id: string, updates: Partial<InsertSchedule>): Promise<Schedule> {
    const [updatedSchedule] = await db
      .update(schedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Broadcast operations
  async getBroadcasts(organizationId: string): Promise<Broadcast[]> {
    return await db.select().from(broadcasts)
      .where(eq(broadcasts.organizationId, organizationId))
      .orderBy(desc(broadcasts.createdAt));
  }

  async createBroadcast(broadcast: InsertBroadcast): Promise<Broadcast> {
    const [newBroadcast] = await db.insert(broadcasts).values(broadcast).returning();
    return newBroadcast;
  }

  async updateBroadcast(id: string, updates: Partial<InsertBroadcast>): Promise<Broadcast> {
    const [updatedBroadcast] = await db
      .update(broadcasts)
      .set(updates)
      .where(eq(broadcasts.id, id))
      .returning();
    return updatedBroadcast;
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(organizationId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
  }

  // Stats operations
  async getOrganizationStats(organizationId: string): Promise<{
    activeScreens: number;
    mediaAssets: number;
    activePlaylists: number;
    recentActivity: AuditLog[];
  }> {
    const [screenStats] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(screens)
      .where(and(eq(screens.organizationId, organizationId), eq(screens.isOnline, true)));

    const [mediaStats] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(media)
      .where(eq(media.organizationId, organizationId));

    const [playlistStats] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(playlists)
      .where(and(eq(playlists.organizationId, organizationId), eq(playlists.isActive, true)));

    const recentActivity = await db.select().from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    return {
      activeScreens: screenStats?.count || 0,
      mediaAssets: mediaStats?.count || 0,
      activePlaylists: playlistStats?.count || 0,
      recentActivity,
    };
  }
}

export const storage = new DatabaseStorage();
