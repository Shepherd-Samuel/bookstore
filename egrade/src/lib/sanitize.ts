import { z } from "zod";

// Strip HTML tags and dangerous characters
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[<>"'`]/g, "") // remove dangerous chars
    .trim();
}

// Sanitize and limit length
export function sanitizeInput(input: string, maxLength = 500): string {
  return sanitizeText(input).slice(0, maxLength);
}

// Common validation schemas
export const nameSchema = z.string().trim().min(1, "Required").max(100, "Too long").transform(sanitizeText);
export const emailSchema = z.string().trim().email("Invalid email").max(255, "Too long");
export const phoneSchema = z.string().trim().max(20, "Too long").regex(/^[+\d\s()-]*$/, "Invalid phone").optional().or(z.literal(""));
export const textSchema = z.string().trim().max(1000, "Too long").transform(sanitizeText);
export const shortTextSchema = z.string().trim().max(255, "Too long").transform(sanitizeText);
export const admNoSchema = z.string().trim().min(1, "Required").max(50, "Too long").regex(/^[a-zA-Z0-9/\-_]+$/, "Invalid format");
export const amountSchema = z.number().min(0, "Must be positive").max(99999999, "Too large");
export const urlSchema = z.string().url("Invalid URL").max(500).optional().or(z.literal(""));

// Sanitize an object's string values
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
  const result = { ...data };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === "string") {
      (result as any)[key] = sanitizeInput(result[key] as string);
    }
  }
  return result;
}
