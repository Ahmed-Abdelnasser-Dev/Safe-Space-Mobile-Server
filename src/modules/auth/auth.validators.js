import { z } from "zod";

/** @type {import("zod").ZodObject<any>} */
export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(200),
    fullName: z.string().min(1).max(200),
    phone: z.string().max(50).optional(),
  })
  .strict();

/** @type {import("zod").ZodObject<any>} */
export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    deviceId: z.string().max(200).optional(),
    fcmToken: z.string().max(500).optional(),
  })
  .strict();

/** @type {import("zod").ZodObject<any>} */
export const refreshSchema = z.object({ refreshToken: z.string().min(1) }).strict();

/** @type {import("zod").ZodObject<any>} */
export const logoutSchema = z.object({ refreshToken: z.string().min(1) }).strict();

/** @type {import("zod").ZodObject<any>} */
export const updateFcmTokenSchema = z
  .object({
    sessionId: z.string().uuid(),
    fcmToken: z.string().max(500),
  })
  .strict();

/** @type {import("zod").ZodObject<any>} */
export const verifyEmailSchema = z
  .object({
    token: z.string().min(1).max(200),
  })
  .strict();

/** @type {import("zod").ZodObject<any>} */
export const resendVerificationSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

