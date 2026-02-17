import { Hono } from "hono";
import { NotificationService } from "../services/notification.service";
import { authMiddleware } from "./middlewares/auth.middleware";
import { NotificationType } from "@prisma/client";
import { HonoResponse } from "../utils/response";

const notificationRouter = new Hono();

// All routes require authentication
notificationRouter.use("/*", authMiddleware);

/**
 * GET /api/notifications
 * Get user notifications
 */
notificationRouter.get("/", async c => {
  try {
    const user = c.get("user");
    const { isRead, type, page, limit } = c.req.query();

    const result = await NotificationService.getUserNotifications(user.userId, user.tenantId, {
      isRead: isRead ? isRead === "true" : undefined,
      type: type as NotificationType,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return c.json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
notificationRouter.patch("/:id/read", async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    const notification = await NotificationService.markAsRead(id, user.userId, user.tenantId);
    return HonoResponse.success(c, notification, "Notification marked as read");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
notificationRouter.patch("/read-all", async c => {
  try {
    const user = c.get("user");
    await NotificationService.markAllAsRead(user.userId, user.tenantId);
    return HonoResponse.success(c, null, "All notifications marked as read");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
notificationRouter.delete("/:id", async c => {
  try {
    const user = c.get("user");
    const id = c.req.param("id");
    await NotificationService.delete(id, user.userId, user.tenantId);
    return HonoResponse.success(c, null, "Notification deleted");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

/**
 * DELETE /api/notifications/read
 * Delete all read notifications
 */
notificationRouter.delete("/read", async c => {
  try {
    const user = c.get("user");
    await NotificationService.deleteAllRead(user.userId, user.tenantId);
    return HonoResponse.success(c, null, "Read notifications deleted");
  } catch (error: any) {
    return HonoResponse.error(c, error.message);
  }
});

export default notificationRouter;
