import { z } from "zod";

/* ----------------------- API RESPONSE (Zod) ----------------------- */

export const ApiResponse = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    data: schema.nullable(),
    error: z.string().nullable(),
    message: z.string().nullable(),
  });

type ApiResponseType<T> = {
  data: T | null;
  error: string | null;
  message: string | null;
};

export const success = <T>(
  data: T,
  message: string | null = null,
): ApiResponseType<T> => ({
  data,
  error: null,
  message,
});

export const failure = (
  error: string,
  message: string | null = null,
): ApiResponseType<null> => ({
  data: null,
  error,
  message,
});
