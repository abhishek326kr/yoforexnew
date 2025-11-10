import { notificationService } from './notificationService';
import * as dashboardWebSocket from './dashboardWebSocket';
import { emailService } from './emailService';
import { storage as db } from '../storage';

interface NotificationHookOptions {
  skipEmail?: boolean;
  skipWebSocket?: boolean;
  skipPreferenceCheck?: boolean;
}

/**
 * Notification hooks for various user actions
 * These are called from storage.ts or routes.ts when actions occur
 */

export async function onForumReply(
  threadId: string, 
  replyAuthorId: string, 
  threadAuthorId: string,
  options: NotificationHookOptions = {}
) {
  try {
    // Don't notify if replying to own thread
    if (replyAuthorId === threadAuthorId) return;

    const [replyAuthor, thread] = await Promise.all([
      db.getUser(replyAuthorId),
      db.getForumThreadById(threadId)
    ]);

    if (!replyAuthor || !thread) return;

    // Create notification
    await notificationService.notifyReply(
      threadAuthorId,
      replyAuthor.username,
      thread.title,
      thread.slug
    );

    const notification = {
      type: 'reply' as const,
      title: `${replyAuthor.username} replied to your thread`,
      message: `Your thread "${thread.title}" has a new reply`,
      actionUrl: `/thread/${thread.slug}`
    };

    // Emit WebSocket notification
    if (!options.skipWebSocket) {
      dashboardWebSocket.emitNotification(threadAuthorId, notification);
    }

    // Queue email notification
    if (!options.skipEmail) {
      await emailService.queueNotificationEmail(threadAuthorId, notification);
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle forum reply notification:', error);
  }
}

export async function onForumThreadLike(
  threadId: string,
  likerId: string,
  authorId: string,
  options: NotificationHookOptions = {}
) {
  try {
    // Don't notify if liking own thread
    if (likerId === authorId) return;

    const [liker, thread] = await Promise.all([
      db.getUser(likerId),
      db.getForumThreadById(threadId)
    ]);

    if (!liker || !thread) return;

    // Create notification - notifyLike takes 4 args, not 5
    await notificationService.notifyLike(
      authorId,
      liker.username,
      thread.title,
      `/forum/thread/${thread.slug}`
    );

    const notification = {
      type: 'like' as const,
      title: `${liker.username} liked your thread`,
      message: `Your thread "${thread.title}" received a like`,
      actionUrl: `/forum/thread/${thread.slug}`
    };

    // Emit WebSocket notification
    if (!options.skipWebSocket) {
      dashboardWebSocket.emitNotification(authorId, notification);
    }

    // Queue email notification (batched in digest)
    if (!options.skipEmail) {
      await emailService.queueDigestNotification(authorId, notification);
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle thread like notification:', error);
  }
}

export async function onUserFollow(
  followerId: string,
  followedId: string,
  options: NotificationHookOptions = {}
) {
  try {
    const follower = await db.getUser(followerId);
    if (!follower) return;

    // Create notification - fix profileImage to profileImageUrl
    await notificationService.notifyFollow(
      followedId,
      follower.username,
      follower.profileImageUrl || `/user/${follower.username}`
    );

    const notification = {
      type: 'follow' as const,
      title: `${follower.username} started following you`,
      message: 'You have a new follower!',
      actionUrl: `/user/${follower.username}`
    };

    // Emit WebSocket notification
    if (!options.skipWebSocket) {
      dashboardWebSocket.emitNotification(followedId, notification);
    }

    // Queue email notification
    if (!options.skipEmail) {
      await emailService.queueNotificationEmail(followedId, notification);
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle follow notification:', error);
  }
}

export async function onMessageReceived(
  conversationId: string,
  senderId: string,
  recipientIds: string[],
  messageContent: string,
  options: NotificationHookOptions = {}
) {
  try {
    const sender = await db.getUser(senderId);
    if (!sender) return;

    // Create notifications for all recipients
    const notifications = await Promise.all(
      recipientIds
        .filter(id => id !== senderId) // Don't notify sender
        .map(recipientId =>
          notificationService.notifyMessage(
            recipientId,
            sender.username,
            messageContent,
            conversationId
          )
        )
    );

    // Emit WebSocket notifications
    if (!options.skipWebSocket) {
      notifications.forEach((notification: any, index: number) => {
        if (notification) {
          dashboardWebSocket.emitNotification(recipientIds[index], notification);
        }
      });
    }

    // Queue email notifications
    if (!options.skipEmail) {
      await Promise.all(
        notifications.map((notification: any, index: number) => {
          if (notification) {
            return emailService.queueNotificationEmail(recipientIds[index], notification);
          }
        })
      );
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle message notification:', error);
  }
}

export async function onMention(
  mentionedUserId: string,
  mentionerUserId: string,
  contentType: 'thread' | 'reply' | 'message',
  contentTitle: string,
  contentUrl: string,
  options: NotificationHookOptions = {}
) {
  try {
    // Don't notify if mentioning self
    if (mentionedUserId === mentionerUserId) return;

    const mentioner = await db.getUser(mentionerUserId);
    if (!mentioner) return;

    // Create notification - notifyMention takes 4 args
    await notificationService.notifyMention(
      mentionedUserId,
      mentioner.username,
      contentTitle,
      contentUrl
    );

    const notification = {
      type: 'system' as const,
      title: `${mentioner.username} mentioned you`,
      message: `You were mentioned in: "${contentTitle}"`,
      actionUrl: contentUrl
    };

    // Emit WebSocket notification
    if (!options.skipWebSocket) {
      dashboardWebSocket.emitNotification(mentionedUserId, notification);
    }

    // Queue email notification (high priority)
    if (!options.skipEmail) {
      await emailService.queueNotificationEmail(mentionedUserId, notification, { priority: 'high' });
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle mention notification:', error);
  }
}

export async function onPurchase(
  buyerId: string,
  sellerId: string,
  itemType: 'ea' | 'indicator' | 'course',
  itemTitle: string,
  amount: number,
  options: NotificationHookOptions = {}
) {
  try {
    const buyer = await db.getUser(buyerId);
    if (!buyer) return;

    // Notify seller - notifyPurchase takes 4 args
    await notificationService.notifyPurchase(
      sellerId,
      buyer.username,
      itemTitle,
      amount
    );

    const sellerNotification = {
      type: 'purchase' as const,
      title: `${buyer.username} purchased your item`,
      message: `"${itemTitle}" was purchased for ${amount} coins`,
      actionUrl: '/marketplace'
    };

    // Notify buyer (confirmation)
    const buyerNotification = await notificationService.createNotification(
      buyerId,
      'purchase',
      'Purchase Confirmed',
      `You successfully purchased "${itemTitle}" for ${amount} sweets`,
      null,
      { itemType, itemTitle, amount }
    );

    // Emit WebSocket notifications
    if (!options.skipWebSocket) {
      dashboardWebSocket.emitNotification(sellerId, sellerNotification);
      if (buyerNotification) {
        dashboardWebSocket.emitNotification(buyerId, buyerNotification);
      }
    }

    // Queue email notifications
    if (!options.skipEmail) {
      await emailService.queueNotificationEmail(sellerId, sellerNotification, { priority: 'high' });
      if (buyerNotification) {
        await emailService.queueNotificationEmail(buyerId, buyerNotification);
      }
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle purchase notification:', error);
  }
}

export async function onBadgeEarned(
  userId: string,
  badgeType: string,
  badgeTitle: string,
  badgeDescription: string,
  options: NotificationHookOptions = {}
) {
  try {
    // Create notification - notifyBadge takes 3 args
    await notificationService.notifyBadge(
      userId,
      badgeTitle,
      badgeDescription
    );

    const notification = {
      type: 'badge' as const,
      title: `You earned the ${badgeTitle} badge!`,
      message: badgeDescription,
      actionUrl: `/user/${userId}`
    };

    // Emit WebSocket notification
    if (!options.skipWebSocket) {
      dashboardWebSocket.emitNotification(userId, notification);
    }

    // Queue email notification
    if (!options.skipEmail) {
      await emailService.queueNotificationEmail(userId, notification);
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle badge notification:', error);
  }
}

export async function onSystemAnnouncement(
  userIds: string[],
  title: string,
  message: string,
  actionUrl?: string,
  options: NotificationHookOptions = {}
) {
  try {
    // Create notifications for all users
    const notifications = await Promise.all(
      userIds.map(userId =>
        notificationService.createNotification(
          userId,
          'system',
          title,
          message,
          actionUrl || null
        )
      )
    );

    // Emit WebSocket notifications
    if (!options.skipWebSocket) {
      notifications.forEach((notification: any, index: number) => {
        if (notification) {
          dashboardWebSocket.emitNotification(userIds[index], notification);
        }
      });
    }

    // Queue email notifications (batched)
    if (!options.skipEmail) {
      await Promise.all(
        notifications.map((notification: any, index: number) => {
          if (notification) {
            return emailService.queueDigestNotification(userIds[index], notification);
          }
        })
      );
    }
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle system announcement:', error);
  }
}

export async function onCoinsEarned(
  userId: string,
  amount: number,
  reason: string,
  options: NotificationHookOptions = {}
) {
  try {
    // Only notify for significant amounts
    if (amount < 5) return;

    // Create notification
    const notification = await notificationService.createNotification(
      userId,
      'badge', // Using badge type for coins
      'Sweets Earned!',
      `You earned ${amount} sweets for ${reason}`,
      null,
      { amount, reason }
    );

    // Emit WebSocket notification
    if (!options.skipWebSocket && notification) {
      dashboardWebSocket.emitNotification(userId, notification);
    }

    // Don't send email for coin notifications (too frequent)
  } catch (error) {
    console.error('[NotificationHooks] Failed to handle coins earned notification:', error);
  }
}

// Batch notification functions for digest emails
export async function sendDailyDigest(userId: string) {
  try {
    const user = await db.getUser(userId);
    if (!user || !user.email) return;

    // Get unread notifications from the past 24 hours
    const notifications = await notificationService.getUserNotifications(userId, 50, 0, 'unread');
    
    if (notifications.length === 0) return;

    await emailService.sendDailyDigest(user.email, user.username, notifications);
  } catch (error) {
    console.error('[NotificationHooks] Failed to send daily digest:', error);
  }
}

export async function sendWeeklyDigest(userId: string) {
  try {
    const user = await db.getUser(userId);
    if (!user || !user.email) return;

    // Get all notifications from the past week
    const notifications = await notificationService.getUserNotifications(userId, 100, 0, 'all');
    
    if (notifications.length === 0) return;

    await emailService.sendWeeklyDigest(user.email, user.username, notifications);
  } catch (error) {
    console.error('[NotificationHooks] Failed to send weekly digest:', error);
  }
}