import { Context } from "hono";
import { logger } from "../../utils/logger.util";
import { HonoResponse } from "../../utils/response";

export const errorHandler = (err: Error, c: Context) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  if (err.name === "PrismaClientKnownRequestError") {
    return HonoResponse.error(c, "Database error occurred", 500);
  }

  if (err.name === "JsonWebTokenError") {
    return HonoResponse.unauthorized(c, "Invalid token");
  }

  return HonoResponse.serverError(c, err.message);
};
