/**
 * Unified API Response Class
 * All API endpoints should return an instance of ApiResponse
 */

import { HTTPHeaders, StatusMap } from "elysia";
import { ElysiaCookie } from "elysia/cookies";

// Response marker to identify ApiResponse instances
const API_RESPONSE_MARKER = Symbol("ApiResponse");

// Standard error codes
export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL_ERROR";

// HTTP status code mapping
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export class ApiResponse<T = any> {
  readonly [API_RESPONSE_MARKER] = true;
  readonly statusCode: number;
  readonly body: {
    error: boolean;
    message: string;
    data: T | null;
    code?: ErrorCode;
  };

  private constructor(statusCode: number, body: ApiResponse<T>["body"]) {
    this.statusCode = statusCode;
    this.body = body;
  }

  /**
   * Success response (200 OK)
   */
  static ok<T>(data: T, message: string = "Success"): ApiResponse<T> {
    return new ApiResponse(200, {
      error: false,
      message,
      data,
    });
  }

  /**
   * Created response (201 Created)
   */
  static created<T>(
    data: T,
    message: string = "Resource created",
  ): ApiResponse<T> {
    return new ApiResponse(201, {
      error: false,
      message,
      data,
    });
  }

  /**
   * No content response (204 No Content)
   */
  static noContent(message: string = "No content"): ApiResponse<null> {
    return new ApiResponse(204, {
      error: false,
      message,
      data: null,
    });
  }

  /**
   * Generic success with custom status code
   */
  static success<T>(
    data: T,
    statusCode: number = 200,
    message: string = "Success",
  ): ApiResponse<T> {
    return new ApiResponse(statusCode, {
      error: false,
      message,
      data,
    });
  }

  /**
   * Validation error (400 Bad Request)
   */
  static validationError(
    message: string = "Validation failed",
  ): ApiResponse<null> {
    return new ApiResponse(ERROR_STATUS_MAP.VALIDATION, {
      error: true,
      message,
      data: null,
      // code: "VALIDATION",
    });
  }

  /**
   * Unauthorized error (401 Unauthorized)
   */
  static unauthorized(message: string = "Unauthorized"): ApiResponse<null> {
    return new ApiResponse(ERROR_STATUS_MAP.UNAUTHORIZED, {
      error: true,
      message,
      data: null,
      // code: "UNAUTHORIZED",
    });
  }

  /**
   * Forbidden error (403 Forbidden)
   */
  static forbidden(message: string = "Forbidden"): ApiResponse<null> {
    return new ApiResponse(ERROR_STATUS_MAP.FORBIDDEN, {
      error: true,
      message,
      data: null,
      // code: "FORBIDDEN",
    });
  }

  /**
   * Not found error (404 Not Found)
   */
  static notFound(message: string = "Resource not found"): ApiResponse<null> {
    return new ApiResponse(ERROR_STATUS_MAP.NOT_FOUND, {
      error: true,
      message,
      data: null,
      // code: "NOT_FOUND",
    });
  }

  /**
   * Conflict error (409 Conflict)
   */
  static conflict(
    message: string = "Resource already exists",
  ): ApiResponse<null> {
    return new ApiResponse(ERROR_STATUS_MAP.CONFLICT, {
      error: true,
      message,
      data: null,
      // code: "CONFLICT",
    });
  }

  /**
   * Internal server error (500 Internal Server Error)
   */
  static internalError(
    message: string = "Internal server error",
  ): ApiResponse<null> {
    return new ApiResponse(ERROR_STATUS_MAP.INTERNAL_ERROR, {
      error: true,
      message,
      data: null,
      // code: "INTERNAL_ERROR",
    });
  }

  /**
   * Generic error with custom status and code
   */
  static error(
    code: ErrorCode,
    message: string,
    statusCode?: number,
  ): ApiResponse<null> {
    return new ApiResponse(statusCode ?? ERROR_STATUS_MAP[code], {
      error: true,
      message,
      data: null,
      // code,
    });
  }

  /**
   * Check if object is an ApiResponse instance
   */
  static isApiResponse(obj: any): obj is ApiResponse {
    return obj?.[API_RESPONSE_MARKER] === true;
  }

  /**
   * Convert to Elysia-compatible response
   * Sets the status code and returns the JSON body
   */
  toResponse(set: {
    headers: HTTPHeaders;
    status?: number | keyof StatusMap;
    redirect?: string;
    cookie?: Record<string, ElysiaCookie>;
  }) {
    set.status = this.statusCode;
    return this.body;
  }
}
