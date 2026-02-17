import { Context, Next } from "hono";
import { z, ZodSchema } from "zod";
import { HonoResponse } from "../../utils/response";

export const validate = (schema: ZodSchema) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      schema.parse(body);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return HonoResponse.error(c, "Validation failed", 400, error);
      }
      return HonoResponse.error(c, "Invalid request body");
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      schema.parse(query);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return HonoResponse.error(c, "Validation failed", 400, error);
      }
      return HonoResponse.error(c, "Invalid query parameters");
    }
  };
};
