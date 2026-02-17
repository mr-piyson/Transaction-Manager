import { Context } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

export class HonoResponse {
  static success<T>(c: Context, data: T, message = "Success", statusCode: ContentfulStatusCode = 200) {
    return c.json(
      {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }

  static error(c: Context, message: string, statusCode: ContentfulStatusCode = 400, errors?: any) {
    return c.json(
      {
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }

  static created<T>(c: Context, data: T, message = "Created successfully") {
    return this.success(c, data, message, 201);
  }

  static noContent(c: Context) {
    return c.body(null, 204);
  }

  static unauthorized(c: Context, message = "Unauthorized") {
    return this.error(c, message, 401);
  }

  static forbidden(c: Context, message = "Forbidden") {
    return this.error(c, message, 403);
  }

  static notFound(c: Context, message = "Resource not found") {
    return this.error(c, message, 404);
  }

  static serverError(c: Context, message = "Internal server error") {
    return this.error(c, message, 500);
  }

  static paginated<T>(c: Context, data: T[], page: number, limit: number, total: number, message = "Success") {
    return c.json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
