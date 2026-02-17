import { EventEmitter } from "events";
import { logger } from "../utils/logger.util";
import db from "@/lib/database";

// 1. Define your payload interface
export interface NotificationJobData {
  notificationId?: string;
  channel: string;
  recipient: string;
  title: string;
  message: string;
}

// 2. Create the Postgres Worker Class
class PostgresNotificationWorker extends EventEmitter {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    public name: string,
    private concurrency: number = 5,
    private pollIntervalMs: number = 2000,
  ) {
    super();
  }

  /**
   * Starts the polling mechanism
   */
  start() {
    if (this.isRunning) {
      logger.info(`Worker is Already Running [${this.name}] with concurrency ${this.concurrency}`);
      return;
    }
    this.isRunning = true;
    logger.info(`Started Postgres Worker [${this.name}] with concurrency ${this.concurrency}`);
    this.poll();
  }

  /**
   * Stops the worker gracefully
   */
  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    logger.info(`Stopped Postgres Worker [${this.name}]`);
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      // Fetch and lock jobs up to the concurrency limit using SKIP LOCKED
      // This exactly replaces BullMQ's Redis-based locking mechanism
      const jobs: any[] = await db.$queryRaw`
        UPDATE "NotificationJob"
        SET status = 'PROCESSING'::"JobStatus", "updatedAt" = NOW()
        WHERE id IN (
          SELECT id
          FROM "NotificationJob"
          WHERE status = 'PENDING'::"JobStatus"
          ORDER BY "createdAt" ASC
          LIMIT ${this.concurrency}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
      `;

      if (jobs.length > 0) {
        // Process all locked jobs concurrently
        await Promise.allSettled(jobs.map(job => this.processJob(job)));
      }
    } catch (error) {
      logger.error(`[Worker ${this.name}] Polling error:`, error);
    } finally {
      // Schedule the next poll. If we found jobs, poll immediately.
      // If idle, wait for the interval.
      this.timer = setTimeout(() => this.poll(), this.pollIntervalMs);
    }
  }

  private async processJob(job: any) {
    const data = job.payload as NotificationJobData;
    logger.info(`Processing notification: ${job.id} - Channel: ${data.channel}`);

    try {
      // 1. Execute channel-specific logic
      switch (data.channel) {
        case "EMAIL":
          await sendEmail(data.recipient, data.title, data.message);
          break;
        case "SMS":
          await sendSMS(data.recipient, data.message);
          break;
        case "PUSH":
          await sendPushNotification(data.recipient, data.title, data.message);
          break;
        default:
          logger.warn(`Unknown notification channel: ${data.channel}`);
      }

      // 2. Update the main Notification record as sent (if applicable)
      if (data.notificationId) {
        await db.notification.update({
          where: { id: data.notificationId },
          data: { sentAt: new Date() },
        });
      }

      // 3. Mark the Queue Job as completed
      await db.notificationJob.update({
        where: { id: job.id },
        data: { status: "COMPLETED" },
      });

      logger.info(`Notification ${job.id} sent successfully`);
      this.emit("completed", job);
    } catch (error: any) {
      // 4. Handle failures
      logger.error(`Failed to send notification ${job.id}:`, error);

      await db.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: error.message,
          attempts: { increment: 1 },
        },
      });

      this.emit("failed", job, error);
    }
  }
}

// ============================================================================
// Instance Creation & Event Listeners (Matches your BullMQ setup)
// ============================================================================

// Define a type for the global object to keep TypeScript happy
const globalForWorker = global as unknown as {
  notificationWorker: PostgresNotificationWorker | undefined;
};

// Export the existing instance or create a new one
export const notificationWorker = globalForWorker.notificationWorker ?? new PostgresNotificationWorker("notifications", 5);

// In development, save the instance to the global object
if (process.env.NODE_ENV !== "production") {
  globalForWorker.notificationWorker = notificationWorker;
}

// Only start if it hasn't been started yet
if (!(notificationWorker as any).isRunning) {
  notificationWorker.start();
}

notificationWorker.on("completed", job => {
  logger.info(`Job ${job.id} completed`);
});

notificationWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

// Start the worker (you can call this in your server.ts/index.ts)
// notificationWorker.start();

// ============================================================================
// Mock Implementations
// ============================================================================

async function sendEmail(to: string, subject: string, body: string) {
  logger.info(`[EMAIL] To: ${to}, Subject: ${subject}`);
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function sendSMS(to: string, message: string) {
  logger.info(`[SMS] To: ${to}, Message: ${message}`);
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function sendPushNotification(userId: string, title: string, body: string) {
  logger.info(`[PUSH] User: ${userId}, Title: ${title}`);
  await new Promise(resolve => setTimeout(resolve, 100));
}
