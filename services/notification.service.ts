import { NotificationType, NotificationChannel, Prisma } from "@prisma/client";
import db from "@/lib/database";

export const notificationQueue = {
  /**
   * Adds a single job to the queue
   */
  async add(name: string, data: any) {
    return db.notificationJob.create({
      data: {
        name,
        payload: data,
        status: "PENDING",
      },
    });
  },

  /**
   * Adds multiple jobs to the queue in one transaction
   */
  async addBulk(jobs: { name: string; data: any }[]) {
    return db.notificationJob.createMany({
      data: jobs.map(job => ({
        name: job.name,
        payload: job.data,
        status: "PENDING",
      })),
    });
  },
};

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  /**
   * Create and send notification
   */
  static async create(tenantId: string, data: CreateNotificationDTO) {
    // Verify user belongs to tenant
    const user = await db.user.findFirst({
      where: { id: data.userId, tenantId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        tenantId,
        type: data.type,
        channel: data.channel,
        title: data.title,
        message: data.message,
        data: data.data,
      },
    });

    // Queue notification for delivery (except IN_APP which is already created)
    if (data.channel !== "IN_APP") {
      await notificationQueue.add("send-notification", {
        notificationId: notification.id,
        channel: data.channel,
        recipient: user.email,
        title: data.title,
        message: data.message,
      });
    }

    return notification;
  }

  /**
   * Create bulk notifications
   */
  static async createBulk(tenantId: string, userIds: string[], notification: Omit<CreateNotificationDTO, "userId">) {
    const users = await db.user.findMany({
      where: {
        id: { in: userIds },
        tenantId,
      },
    });

    if (users.length === 0) {
      throw new Error("No valid users found");
    }

    const notifications = await db.notification.createMany({
      data: users.map(user => ({
        userId: user.id,
        tenantId,
        type: notification.type,
        channel: notification.channel,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      })),
    });

    // Queue notifications for delivery
    if (notification.channel !== "IN_APP") {
      const jobs = users.map(user => ({
        name: "send-notification",
        data: {
          channel: notification.channel,
          recipient: user.email,
          title: notification.title,
          message: notification.message,
        },
      }));

      await notificationQueue.addBulk(jobs);
    }

    return notifications;
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    tenantId: string,
    filters: {
      isRead?: boolean;
      type?: NotificationType;
      page?: number;
      limit?: number;
    },
  ) {
    const { isRead, type, page = 1, limit = 20 } = filters;

    const where: Prisma.NotificationWhereInput = {
      userId,
      tenantId,
      ...(isRead !== undefined && { isRead }),
      ...(type && { type }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.notification.count({ where }),
      db.notification.count({
        where: { userId, tenantId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: string, userId: string, tenantId: string) {
    const notification = await db.notification.findFirst({
      where: { id, userId, tenantId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return db.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string, tenantId: string) {
    return db.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete notification
   */
  static async delete(id: string, userId: string, tenantId: string) {
    const notification = await db.notification.findFirst({
      where: { id, userId, tenantId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    return db.notification.delete({
      where: { id },
    });
  }

  /**
   * Delete all read notifications
   */
  static async deleteAllRead(userId: string, tenantId: string) {
    return db.notification.deleteMany({
      where: { userId, tenantId, isRead: true },
    });
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(tenantId: string, stockItem: any) {
    // Get warehouse managers and admins
    const users = await db.user.findMany({
      where: {
        tenantId,
        role: { in: ["ADMIN", "WAREHOUSE_MANAGER"] },
        isActive: true,
      },
    });

    return this.createBulk(
      tenantId,
      users.map(u => u.id),
      {
        type: "WARNING",
        channel: "IN_APP",
        title: "Low Stock Alert",
        message: `Stock item "${stockItem.name}" (SKU: ${stockItem.sku}) is running low. Current quantity: ${stockItem.quantity}, Minimum: ${stockItem.minQuantity}`,
        data: { stockItemId: stockItem.id },
      },
    );
  }

  /**
   * Send invoice overdue alert
   */
  static async sendInvoiceOverdueAlert(tenantId: string, invoice: any) {
    const users = await db.user.findMany({
      where: {
        tenantId,
        role: { in: ["ADMIN", "ACCOUNTANT"] },
        isActive: true,
      },
    });

    return this.createBulk(
      tenantId,
      users.map(u => u.id),
      {
        type: "WARNING",
        channel: "IN_APP",
        title: "Invoice Overdue",
        message: `Invoice ${invoice.invoiceNumber} for ${invoice.customer.name} is overdue. Amount: ${invoice.total}`,
        data: { invoiceId: invoice.id },
      },
    );
  }
}
