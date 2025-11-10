import { db } from "../db";
import { 
  notifications, 
  users, 
  coinTransactions,
  forumReplies,
  forumThreads,
  userFollows,
  type InsertNotification,
  type Notification,
  emailNotifications,
  type EmailNotification,
  type InsertEmailNotification
} from "../../shared/schema";
import { eq, and, desc, gte, lt, inArray } from "drizzle-orm";
import { emailQueueService, EmailPriority, EmailGroupType } from "./emailQueue";
import { emitNotification } from "./dashboardWebSocket";

// Notification types that should trigger email
const EMAIL_ENABLED_TYPES = [
  "reply",
  "like", 
  "follow",
  "mention",
  "purchase",
  "badge",
  "coin_milestone"
];

class NotificationService {
  /**
   * Create a notification and optionally send email
   */
  async create(notification: InsertNotification): Promise<Notification> {
    try {
      // Create the in-app notification
      const [created] = await db.insert(notifications)
        .values(notification)
        .returning();

      // Emit real-time notification via WebSocket
      if (created) {
        await this.emitRealTimeNotification(created);
      }

      // Check if email should be sent for this notification type
      if (EMAIL_ENABLED_TYPES.includes(notification.type)) {
        await this.checkAndSendEmail(created);
      }

      return created;
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Create multiple notifications in batch
   */
  async createBatch(notifications: InsertNotification[]): Promise<Notification[]> {
    try {
      if (notifications.length === 0) return [];

      const created = await db.insert(notifications)
        .values(notifications)
        .returning();

      // Emit real-time notifications
      for (const notification of created) {
        await this.emitRealTimeNotification(notification);
      }

      // Process email notifications
      const emailEligible = created.filter(n => EMAIL_ENABLED_TYPES.includes(n.type));
      for (const notification of emailEligible) {
        await this.checkAndSendEmail(notification);
      }

      return created;
    } catch (error) {
      console.error('[NotificationService] Failed to create batch notifications:', error);
      throw error;
    }
  }

  /**
   * Emit real-time notification via WebSocket
   */
  private async emitRealTimeNotification(notification: Notification) {
    try {
      emitNotification(notification.userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString()
      });
    } catch (error) {
      console.error('[NotificationService] Failed to emit real-time notification:', error);
    }
  }

  /**
   * Check user preferences and send email if enabled
   */
  private async checkAndSendEmail(notification: Notification) {
    try {
      // Get user preferences
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, notification.userId))
        .limit(1);

      if (!user || !user.email || !user.emailNotifications) {
        return; // User doesn't want email notifications
      }

      // Create email notification record
      const emailNotif: InsertEmailNotification = {
        userId: notification.userId,
        templateKey: `${notification.type}_notification`,
        subject: notification.title,
        recipientEmail: user.email,
        status: "queued",
        variables: {
          username: user.username,
          message: notification.message,
          actionUrl: notification.actionUrl,
          notificationType: notification.type
        }
      };

      const [emailRecord] = await db.insert(emailNotifications)
        .values(emailNotif)
        .returning();

      // Queue the email
      await emailQueueService.queueEmail({
        to: user.email,
        subject: notification.title,
        template: `notification_${notification.type}`,
        data: {
          username: user.username,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl ? `https://yoforex.com${notification.actionUrl}` : null,
          notificationType: notification.type
        },
        priority: EmailPriority.HIGH,
        groupType: EmailGroupType.TRANSACTIONAL,
        trackingId: emailRecord.id
      });
    } catch (error) {
      console.error('[NotificationService] Failed to send email notification:', error);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(
    userId: string, 
    limit = 50,
    offset = 0,
    type?: string
  ): Promise<Notification[]> {
    let query = db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    if (type && type !== "all") {
      query = db.select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.type, type as any)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return await query;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.select({ count: db.count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    
    return result[0]?.count || 0;
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysToKeep = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db.delete(notifications)
      .where(
        and(
          lt(notifications.createdAt, cutoffDate),
          eq(notifications.isRead, true)
        )
      )
      .returning({ id: notifications.id });

    return result.length;
  }

  /**
   * Create notification for new reply
   */
  async notifyReply(
    threadAuthorId: string,
    replierUsername: string,
    threadTitle: string,
    threadSlug: string
  ): Promise<void> {
    await this.create({
      userId: threadAuthorId,
      type: "reply",
      title: `${replierUsername} replied to your thread`,
      message: `Your thread "${threadTitle}" has a new reply`,
      actionUrl: `/thread/${threadSlug}`,
      isRead: false
    });
  }

  /**
   * Create notification for new like
   */
  async notifyLike(
    contentAuthorId: string,
    likerUsername: string,
    contentTitle: string,
    contentUrl: string
  ): Promise<void> {
    await this.create({
      userId: contentAuthorId,
      type: "like",
      title: `${likerUsername} liked your content`,
      message: `Your content "${contentTitle}" received a like`,
      actionUrl: contentUrl,
      isRead: false
    });
  }

  /**
   * Create notification for new follower
   */
  async notifyFollow(
    followedUserId: string,
    followerUsername: string,
    followerProfileUrl: string
  ): Promise<void> {
    await this.create({
      userId: followedUserId,
      type: "follow",
      title: `${followerUsername} started following you`,
      message: "You have a new follower!",
      actionUrl: followerProfileUrl,
      isRead: false
    });
  }

  /**
   * Create notification for mention
   */
  async notifyMention(
    mentionedUserId: string,
    mentionerUsername: string,
    context: string,
    url: string
  ): Promise<void> {
    await this.create({
      userId: mentionedUserId,
      type: "system", // Using system type as mention isn't in the enum
      title: `${mentionerUsername} mentioned you`,
      message: `You were mentioned in: "${context}"`,
      actionUrl: url,
      isRead: false
    });
  }

  /**
   * Create notification for purchase
   */
  async notifyPurchase(
    sellerId: string,
    buyerUsername: string,
    itemTitle: string,
    amount: number
  ): Promise<void> {
    await this.create({
      userId: sellerId,
      type: "purchase",
      title: `${buyerUsername} purchased your item`,
      message: `"${itemTitle}" was purchased for ${amount} coins`,
      actionUrl: `/marketplace`,
      isRead: false
    });
  }

  /**
   * Create notification for badge earned
   */
  async notifyBadge(
    userId: string,
    badgeName: string,
    badgeDescription: string
  ): Promise<void> {
    await this.create({
      userId: userId,
      type: "badge",
      title: `You earned the ${badgeName} badge!`,
      message: badgeDescription,
      actionUrl: `/user/${userId}`,
      isRead: false
    });
  }

  /**
   * Create system notification
   */
  async notifySystem(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string | null
  ): Promise<void> {
    await this.create({
      userId: userId,
      type: "system",
      title: title,
      message: message,
      actionUrl: actionUrl,
      isRead: false
    });
  }

  /**
   * Notify multiple users (for announcements)
   */
  async notifyMultipleUsers(
    userIds: string[],
    title: string,
    message: string,
    actionUrl?: string | null
  ): Promise<void> {
    const notifications: InsertNotification[] = userIds.map(userId => ({
      userId,
      type: "system",
      title,
      message,
      actionUrl,
      isRead: false
    }));

    await this.createBatch(notifications);
  }

  /**
   * Alias for create method (for backward compatibility)
   */
  async createNotification(
    userId: string,
    type: InsertNotification['type'],
    title: string,
    message: string,
    actionUrl: string | null = null,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    return this.create({
      userId,
      type,
      title,
      message,
      actionUrl,
      isRead: false
    });
  }

  /**
   * Create notification for new message
   */
  async notifyMessage(
    recipientId: string,
    senderUsername: string,
    messageContent: string,
    conversationId: string
  ): Promise<Notification> {
    const truncatedMessage = messageContent.length > 100 
      ? messageContent.substring(0, 100) + '...' 
      : messageContent;
    
    return this.create({
      userId: recipientId,
      type: "system", // Using system type since message type doesn't exist in enum
      title: `New message from ${senderUsername}`,
      message: truncatedMessage,
      actionUrl: `/messages?conversation=${conversationId}`,
      isRead: false
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();