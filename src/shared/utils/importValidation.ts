import { SessionData } from "@shared/types";
import { z } from "zod";

const cookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string(),
  secure: z.boolean(),
  httpOnly: z.boolean(),
  sameSite: z.enum(["strict", "lax", "none", "no_restriction"]),
  expirationDate: z.number().optional(),
  storeId: z.string().optional(),
  hostOnly: z.boolean().optional(),
  session: z.boolean().optional(),
});

const sessionDataSchema: z.ZodType<SessionData> = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  domain: z.string().min(1),
  createdAt: z.number().int().positive(),
  lastUsed: z.number().int().positive(),
  order: z.number().int().nonnegative(),
  cookies: z.array(cookieSchema),
  localStorage: z.record(z.string()),
  sessionStorage: z.record(z.string()),
});

export const importSchema = z.object({
  version: z.string(),
  exportedAt: z.string().datetime(),
  sessions: z.array(sessionDataSchema),
});

export type ImportData = z.infer<typeof importSchema>;

export function validateImportData(data: unknown): ImportData {
  return importSchema.parse(data);
}

export function safeValidateImportData(
  data: unknown
): { success: true; data: ImportData } | { success: false; error: string } {
  const result = importSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ") };
}
