import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import type { AppError } from "../types/errors.js";

dotenv.config();

type EnvValidationIssue = { path: string; message: string };

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Auth (implemented last, but required for auth endpoints)
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),

  // Firebase Cloud Messaging
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),

  // Central Unit outbound
  CENTRAL_UNIT_BASE_URL: z.string().url().optional(),

  // Central Unit inbound auth (dev default: proxy header)
  CENTRAL_UNIT_INBOUND_AUTH_MODE: z
    .enum(["mtls", "proxy", "off"])
    .default("proxy"),
  CENTRAL_UNIT_MTLS_CA_CERT_PATH: z.string().optional(),
  CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN: z.string().optional(),
  CENTRAL_UNIT_PROXY_VERIFIED_HEADER: z
    .string()
    .default("x-client-cert-verified"),

  // Server TLS (for local/dev mTLS)
  TLS_CERT_PATH: z.string().optional(),
  TLS_KEY_PATH: z.string().optional(),
});

function createEnvValidationError(details: EnvValidationIssue[]): AppError {
  const err = new Error("Invalid environment variables") as AppError;
  err.code = "ENV_VALIDATION_ERROR";
  err.details = details;
  return err;
}

export function getEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details: EnvValidationIssue[] = parsed.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));

    throw createEnvValidationError(details);
  }
  return parsed.data;
}

export function readFileIfExists(p: string | null | undefined): Buffer | null {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
}

