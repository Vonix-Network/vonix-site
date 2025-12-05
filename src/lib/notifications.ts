/**
 * Notification Helper Functions
 * Create notifications for various user actions
 */

import { db } from '@/db';
import { notifications } from '@/db/schema';

export interface CreateNotificationParams {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        read: false,
      })
      .returning();

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Notification Templates
 */

export async function notifyNewMessage(userId: number, senderName: string) {
  return createNotification({
    userId,
    type: 'message',
    title: 'New Message',
    message: `${senderName} sent you a message`,
    link: `/messages`,
  });
}

export async function notifyFriendRequest(userId: number, requesterName: string) {
  return createNotification({
    userId,
    type: 'friend_request',
    title: 'Friend Request',
    message: `${requesterName} sent you a friend request`,
    link: `/friends`,
  });
}

export async function notifyFriendAccepted(userId: number, accepterName: string) {
  return createNotification({
    userId,
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    message: `${accepterName} accepted your friend request`,
    link: `/friends`,
  });
}

export async function notifyPostLike(userId: number, likerName: string, postId: number) {
  return createNotification({
    userId,
    type: 'post_like',
    title: 'New Like',
    message: `${likerName} liked your post`,
    link: `/social?post=${postId}`,
  });
}

export async function notifyPostComment(userId: number, commenterName: string, postId: number) {
  return createNotification({
    userId,
    type: 'post_comment',
    title: 'New Comment',
    message: `${commenterName} commented on your post`,
    link: `/social?post=${postId}`,
  });
}

export async function notifyForumReply(userId: number, replierName: string, postId: number) {
  return createNotification({
    userId,
    type: 'forum_reply',
    title: 'New Reply',
    message: `${replierName} replied to your forum post`,
    link: `/forum/post/${postId}`,
  });
}

export async function notifyMention(userId: number, mentionerName: string, link: string) {
  return createNotification({
    userId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${mentionerName} mentioned you`,
    link,
  });
}

export async function notifyEventInvite(userId: number, inviterName: string, eventId: number, eventTitle: string) {
  return createNotification({
    userId,
    type: 'event_invite',
    title: 'Event Invitation',
    message: `${inviterName} invited you to "${eventTitle}"`,
    link: `/events/${eventId}`,
  });
}

export async function notifyGroupInvite(userId: number, inviterName: string, groupId: number, groupName: string) {
  return createNotification({
    userId,
    type: 'group_invite',
    title: 'Group Invitation',
    message: `${inviterName} invited you to join "${groupName}"`,
    link: `/groups/${groupId}`,
  });
}

export async function notifyAchievement(userId: number, achievementName: string) {
  return createNotification({
    userId,
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: `You earned the "${achievementName}" achievement`,
    link: `/profile`,
  });
}

