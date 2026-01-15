/**
 * Schema Re-exports
 * 
 * This file dynamically re-exports schema definitions based on DATABASE_TYPE.
 * This ensures that all routes use the same schema that the database connection uses.
 * 
 * For SQLite/Turso: schema-sqlite.ts
 * For PostgreSQL/Supabase: schema-postgres.ts  
 * For MySQL/MariaDB: schema-mysql.ts
 */

// Get database type from environment
const DATABASE_TYPE = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();

// Determine which schema to use
function getSchemaType(): 'sqlite' | 'postgres' | 'mysql' {
  switch (DATABASE_TYPE) {
    case 'sqlite':
    case 'turso':
    case 'libsql':
      return 'sqlite';
    case 'postgres':
    case 'postgresql':
    case 'supabase':
      return 'postgres';
    case 'mysql':
    case 'mariadb':
      return 'mysql';
    default:
      return 'sqlite';
  }
}

const schemaType = getSchemaType();

// Dynamic schema loading - we use require to load at runtime based on DATABASE_TYPE
// This ensures the schema used in queries matches the schema loaded by the db proxy
let schemaModule: any;

if (schemaType === 'postgres') {
  schemaModule = require('./schema-postgres');
} else if (schemaType === 'mysql') {
  schemaModule = require('./schema-mysql');
} else {
  schemaModule = require('./schema-sqlite');
}

// Re-export all schema tables and utilities dynamically
export const users = schemaModule.users;
export const sessions = schemaModule.sessions;
export const servers = schemaModule.servers;
export const serverXp = schemaModule.serverXp;
export const forumCategories = schemaModule.forumCategories;
export const forumPosts = schemaModule.forumPosts;
export const forumReplies = schemaModule.forumReplies;
export const forumVotes = schemaModule.forumVotes;
export const socialPosts = schemaModule.socialPosts;
export const socialComments = schemaModule.socialComments;
export const socialLikes = schemaModule.socialLikes;
export const friendships = schemaModule.friendships;
export const privateMessages = schemaModule.privateMessages;
export const donations = schemaModule.donations;
export const donationRanks = schemaModule.donationRanks;
export const groups = schemaModule.groups;
export const groupMembers = schemaModule.groupMembers;
export const events = schemaModule.events;
export const eventAttendees = schemaModule.eventAttendees;
export const notifications = schemaModule.notifications;
export const xpTransactions = schemaModule.xpTransactions;
export const achievements = schemaModule.achievements;
export const userAchievements = schemaModule.userAchievements;
export const reportedContent = schemaModule.reportedContent;
export const siteSettings = schemaModule.siteSettings;
export const setupStatus = schemaModule.setupStatus;
export const apiKeys = schemaModule.apiKeys;
export const serverUptimeRecords = schemaModule.serverUptimeRecords;
export const announcements = schemaModule.announcements;
export const discordMessages = schemaModule.discordMessages;
export const ticketCategories = schemaModule.ticketCategories;
export const ticketQuestions = schemaModule.ticketQuestions;
export const supportTickets = schemaModule.supportTickets;
export const ticketMessages = schemaModule.ticketMessages;
export const ticketAnswers = schemaModule.ticketAnswers;
export const guestTicketTokens = schemaModule.guestTicketTokens;
export const ticketFeedback = schemaModule.ticketFeedback;
export const ticketTags = schemaModule.ticketTags;
export const archivedMessages = schemaModule.archivedMessages;
export const ticketSettings = schemaModule.ticketSettings;
export const auditLogs = schemaModule.auditLogs;
export const passwordResetTokens = schemaModule.passwordResetTokens;
export const registrationCodes = schemaModule.registrationCodes;

// ===================================
// TYPE EXPORTS (from SQLite for type compatibility)
// These provide TypeScript types - the actual runtime values come from the correct schema above
// ===================================

import type {
  users as usersType,
  sessions as sessionsType,
  servers as serversType,
  serverXp as serverXpType,
  forumCategories as forumCategoriesType,
  forumPosts as forumPostsType,
  forumReplies as forumRepliesType,
  socialPosts as socialPostsType,
  friendships as friendshipsType,
  privateMessages as privateMessagesType,
  donations as donationsType,
  donationRanks as donationRanksType,
  groups as groupsType,
  events as eventsType,
  notifications as notificationsType,
  achievements as achievementsType,
  reportedContent as reportedContentType,
  serverUptimeRecords as serverUptimeRecordsType,
  announcements as announcementsType,
  discordMessages as discordMessagesType,
  supportTickets as supportTicketsType,
  ticketMessages as ticketMessagesType,
  ticketFeedback as ticketFeedbackType,
  ticketTags as ticketTagsType,
  archivedMessages as archivedMessagesType,
  ticketSettings as ticketSettingsType,
} from './schema-sqlite';

export type User = typeof usersType.$inferSelect;
export type NewUser = typeof usersType.$inferInsert;
export type Session = typeof sessionsType.$inferSelect;
export type Server = typeof serversType.$inferSelect;
export type ServerXp = typeof serverXpType.$inferSelect;
export type ForumCategory = typeof forumCategoriesType.$inferSelect;
export type ForumPost = typeof forumPostsType.$inferSelect;
export type ForumReply = typeof forumRepliesType.$inferSelect;
export type SocialPost = typeof socialPostsType.$inferSelect;
export type Friendship = typeof friendshipsType.$inferSelect;
export type PrivateMessage = typeof privateMessagesType.$inferSelect;
export type Donation = typeof donationsType.$inferSelect;
export type DonationRank = typeof donationRanksType.$inferSelect;
export type Group = typeof groupsType.$inferSelect;
export type Event = typeof eventsType.$inferSelect;
export type Notification = typeof notificationsType.$inferSelect;
export type Achievement = typeof achievementsType.$inferSelect;
export type ReportedContent = typeof reportedContentType.$inferSelect;
export type ServerUptimeRecord = typeof serverUptimeRecordsType.$inferSelect;
export type Announcement = typeof announcementsType.$inferSelect;
export type DiscordMessage = typeof discordMessagesType.$inferSelect;
export type SupportTicket = typeof supportTicketsType.$inferSelect;
export type TicketMessage = typeof ticketMessagesType.$inferSelect;
export type TicketFeedback = typeof ticketFeedbackType.$inferSelect;
export type TicketTag = typeof ticketTagsType.$inferSelect;
export type ArchivedMessage = typeof archivedMessagesType.$inferSelect;
export type TicketSettings = typeof ticketSettingsType.$inferSelect;
