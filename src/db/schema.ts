/**
 * Schema Re-exports
 * 
 * This file re-exports all schema definitions from the SQLite schema for backward compatibility.
 * The actual database connection in index.ts dynamically loads the appropriate schema based on DATABASE_TYPE.
 * 
 * For SQLite/Turso: schema-sqlite.ts
 * For PostgreSQL/Supabase: schema-postgres.ts  
 * For MySQL/MariaDB: schema-mysql.ts
 */

// Re-export everything from SQLite schema as the default
export * from './schema-sqlite';

// ===================================
// TYPE EXPORTS
// ===================================

import type {
  users,
  sessions,
  servers,
  serverXp,
  forumCategories,
  forumPosts,
  forumReplies,
  socialPosts,
  friendships,
  privateMessages,
  donations,
  donationRanks,
  groups,
  events,
  notifications,
  achievements,
  reportedContent,
  serverUptimeRecords,
  announcements,
  discordMessages,
  supportTickets,
  ticketMessages,
  ticketFeedback,
  ticketTags,
  archivedMessages,
  ticketSettings,
} from './schema-sqlite';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Server = typeof servers.$inferSelect;
export type ServerXp = typeof serverXp.$inferSelect;
export type ForumCategory = typeof forumCategories.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type SocialPost = typeof socialPosts.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type PrivateMessage = typeof privateMessages.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type DonationRank = typeof donationRanks.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type ReportedContent = typeof reportedContent.$inferSelect;
export type ServerUptimeRecord = typeof serverUptimeRecords.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type DiscordMessage = typeof discordMessages.$inferSelect;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type TicketFeedback = typeof ticketFeedback.$inferSelect;
export type TicketTag = typeof ticketTags.$inferSelect;
export type ArchivedMessage = typeof archivedMessages.$inferSelect;
export type TicketSettings = typeof ticketSettings.$inferSelect;
