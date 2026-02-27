import { ApiResponse } from "@/lib/api";
import { ZodObject } from "zod";
import type { Context } from "elysia";
// Validation middleware
export const validate = (schemas: {
  params?: ZodObject<any>;
  searchParams?: ZodObject<any>;
  body?: ZodObject<any>;
}) => {
  return async (context: Context) => {
    const { params, query, body, set } = context;

    try {
      // Validate params if present
      if (schemas.params) {
        context.params = schemas.params.parse(params) as Record<string, string>;
      }

      // Validate query (searchParams) if present
      if (schemas.searchParams) {
        context.query = schemas.searchParams.parse(query) as Record<
          string,
          string
        >;
      }

      // Validate body if present
      if (schemas.body) {
        context.body = schemas.body.parse(body);
      }
    } catch (error) {
      // Handle validation errors
      set.status = 400; // Bad Request
      return ApiResponse.validationError(
        "Validation Error",
        // error.errors,
      ).toResponse(set);
    }
  };
};
