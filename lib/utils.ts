import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import z from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseFormData(formData: FormData, schema: z.ZodTypeAny) {
  const raw: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    raw[key] = value.toString();
  }
  return schema.parse(raw);
}
