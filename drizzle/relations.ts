import { relations } from "drizzle-orm/relations";
import { users, announcements, auditLogs, discordMessages, donations, eventAttendees, events, forumPosts, forumCategories, forumReplies, forumVotes, friendships, groupMembers, groups, notifications, privateMessages, registrationCodes, reportedContent, servers, serverUptimeRecords, serverXp, sessions, socialComments, socialPosts, socialLikes, achievements, userAchievements, donationRanks, xpTransactions, passwordResetTokens, supportTickets, ticketMessages } from "./schema";

export const announcementsRelations = relations(announcements, ({one}) => ({
	user: one(users, {
		fields: [announcements.authorId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	announcements: many(announcements),
	auditLogs: many(auditLogs),
	discordMessages: many(discordMessages),
	donations: many(donations),
	eventAttendees: many(eventAttendees),
	events: many(events),
	forumPosts: many(forumPosts),
	forumReplies: many(forumReplies),
	forumVotes: many(forumVotes),
	friendships_friendId: many(friendships, {
		relationName: "friendships_friendId_users_id"
	}),
	friendships_userId: many(friendships, {
		relationName: "friendships_userId_users_id"
	}),
	groupMembers: many(groupMembers),
	groups: many(groups),
	notifications: many(notifications),
	privateMessages_recipientId: many(privateMessages, {
		relationName: "privateMessages_recipientId_users_id"
	}),
	privateMessages_senderId: many(privateMessages, {
		relationName: "privateMessages_senderId_users_id"
	}),
	registrationCodes: many(registrationCodes),
	reportedContents_reviewedBy: many(reportedContent, {
		relationName: "reportedContent_reviewedBy_users_id"
	}),
	reportedContents_reporterId: many(reportedContent, {
		relationName: "reportedContent_reporterId_users_id"
	}),
	serverXps: many(serverXp),
	sessions: many(sessions),
	socialComments: many(socialComments),
	socialLikes: many(socialLikes),
	socialPosts: many(socialPosts),
	userAchievements: many(userAchievements),
	donationRank: one(donationRanks, {
		fields: [users.donationRankId],
		references: [donationRanks.id]
	}),
	xpTransactions: many(xpTransactions),
	passwordResetTokens: many(passwordResetTokens),
	supportTickets_assignedTo: many(supportTickets, {
		relationName: "supportTickets_assignedTo_users_id"
	}),
	supportTickets_userId: many(supportTickets, {
		relationName: "supportTickets_userId_users_id"
	}),
	ticketMessages: many(ticketMessages),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const discordMessagesRelations = relations(discordMessages, ({one}) => ({
	user: one(users, {
		fields: [discordMessages.webUserId],
		references: [users.id]
	}),
}));

export const donationsRelations = relations(donations, ({one}) => ({
	user: one(users, {
		fields: [donations.userId],
		references: [users.id]
	}),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({one}) => ({
	user: one(users, {
		fields: [eventAttendees.userId],
		references: [users.id]
	}),
	event: one(events, {
		fields: [eventAttendees.eventId],
		references: [events.id]
	}),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	eventAttendees: many(eventAttendees),
	user: one(users, {
		fields: [events.creatorId],
		references: [users.id]
	}),
}));

export const forumPostsRelations = relations(forumPosts, ({one, many}) => ({
	user: one(users, {
		fields: [forumPosts.authorId],
		references: [users.id]
	}),
	forumCategory: one(forumCategories, {
		fields: [forumPosts.categoryId],
		references: [forumCategories.id]
	}),
	forumReplies: many(forumReplies),
	forumVotes: many(forumVotes),
}));

export const forumCategoriesRelations = relations(forumCategories, ({many}) => ({
	forumPosts: many(forumPosts),
}));

export const forumRepliesRelations = relations(forumReplies, ({one, many}) => ({
	user: one(users, {
		fields: [forumReplies.authorId],
		references: [users.id]
	}),
	forumPost: one(forumPosts, {
		fields: [forumReplies.postId],
		references: [forumPosts.id]
	}),
	forumVotes: many(forumVotes),
}));

export const forumVotesRelations = relations(forumVotes, ({one}) => ({
	user: one(users, {
		fields: [forumVotes.userId],
		references: [users.id]
	}),
	forumReply: one(forumReplies, {
		fields: [forumVotes.replyId],
		references: [forumReplies.id]
	}),
	forumPost: one(forumPosts, {
		fields: [forumVotes.postId],
		references: [forumPosts.id]
	}),
}));

export const friendshipsRelations = relations(friendships, ({one}) => ({
	user_friendId: one(users, {
		fields: [friendships.friendId],
		references: [users.id],
		relationName: "friendships_friendId_users_id"
	}),
	user_userId: one(users, {
		fields: [friendships.userId],
		references: [users.id],
		relationName: "friendships_userId_users_id"
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
}));

export const groupsRelations = relations(groups, ({one, many}) => ({
	groupMembers: many(groupMembers),
	user: one(users, {
		fields: [groups.creatorId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const privateMessagesRelations = relations(privateMessages, ({one}) => ({
	user_recipientId: one(users, {
		fields: [privateMessages.recipientId],
		references: [users.id],
		relationName: "privateMessages_recipientId_users_id"
	}),
	user_senderId: one(users, {
		fields: [privateMessages.senderId],
		references: [users.id],
		relationName: "privateMessages_senderId_users_id"
	}),
}));

export const registrationCodesRelations = relations(registrationCodes, ({one}) => ({
	user: one(users, {
		fields: [registrationCodes.userId],
		references: [users.id]
	}),
}));

export const reportedContentRelations = relations(reportedContent, ({one}) => ({
	user_reviewedBy: one(users, {
		fields: [reportedContent.reviewedBy],
		references: [users.id],
		relationName: "reportedContent_reviewedBy_users_id"
	}),
	user_reporterId: one(users, {
		fields: [reportedContent.reporterId],
		references: [users.id],
		relationName: "reportedContent_reporterId_users_id"
	}),
}));

export const serverUptimeRecordsRelations = relations(serverUptimeRecords, ({one}) => ({
	server: one(servers, {
		fields: [serverUptimeRecords.serverId],
		references: [servers.id]
	}),
}));

export const serversRelations = relations(servers, ({many}) => ({
	serverUptimeRecords: many(serverUptimeRecords),
	serverXps: many(serverXp),
}));

export const serverXpRelations = relations(serverXp, ({one}) => ({
	server: one(servers, {
		fields: [serverXp.serverId],
		references: [servers.id]
	}),
	user: one(users, {
		fields: [serverXp.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const socialCommentsRelations = relations(socialComments, ({one}) => ({
	user: one(users, {
		fields: [socialComments.userId],
		references: [users.id]
	}),
	socialPost: one(socialPosts, {
		fields: [socialComments.postId],
		references: [socialPosts.id]
	}),
}));

export const socialPostsRelations = relations(socialPosts, ({one, many}) => ({
	socialComments: many(socialComments),
	socialLikes: many(socialLikes),
	user: one(users, {
		fields: [socialPosts.userId],
		references: [users.id]
	}),
}));

export const socialLikesRelations = relations(socialLikes, ({one}) => ({
	socialPost: one(socialPosts, {
		fields: [socialLikes.postId],
		references: [socialPosts.id]
	}),
	user: one(users, {
		fields: [socialLikes.userId],
		references: [users.id]
	}),
}));

export const userAchievementsRelations = relations(userAchievements, ({one}) => ({
	achievement: one(achievements, {
		fields: [userAchievements.achievementId],
		references: [achievements.id]
	}),
	user: one(users, {
		fields: [userAchievements.userId],
		references: [users.id]
	}),
}));

export const achievementsRelations = relations(achievements, ({many}) => ({
	userAchievements: many(userAchievements),
}));

export const donationRanksRelations = relations(donationRanks, ({many}) => ({
	users: many(users),
}));

export const xpTransactionsRelations = relations(xpTransactions, ({one}) => ({
	user: one(users, {
		fields: [xpTransactions.userId],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	user_assignedTo: one(users, {
		fields: [supportTickets.assignedTo],
		references: [users.id],
		relationName: "supportTickets_assignedTo_users_id"
	}),
	user_userId: one(users, {
		fields: [supportTickets.userId],
		references: [users.id],
		relationName: "supportTickets_userId_users_id"
	}),
	ticketMessages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({one}) => ({
	user: one(users, {
		fields: [ticketMessages.userId],
		references: [users.id]
	}),
	supportTicket: one(supportTickets, {
		fields: [ticketMessages.ticketId],
		references: [supportTickets.id]
	}),
}));