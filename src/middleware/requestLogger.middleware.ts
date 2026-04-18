import type { Request, Response, NextFunction } from "express";

const MAX_PREVIEW_LENGTH = 300;
const SENSITIVE_RESPONSE_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "password",
  "token",
  "emailVerificationToken",
]);

function stringifyForLog(body: unknown): string {
  const serialized = JSON.stringify(body, (key, value) => {
    if (SENSITIVE_RESPONSE_KEYS.has(key)) {
      return "[REDACTED]";
    }
    return value;
  });

  if (typeof serialized !== "string") {
    return "[unserializable]";
  }

  return serialized.length > MAX_PREVIEW_LENGTH
    ? `${serialized.slice(0, MAX_PREVIEW_LENGTH)}...(truncated)`
    : serialized;
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "production") {
    return next();
  }

  const start = Date.now();
  const origJson: Response["json"] = res.json.bind(res);

  let responseBodyPreview: string | null = null;

  res.json = ((body: unknown) => {
    try {
      if ((req.originalUrl || req.url).startsWith("/auth/")) {
        responseBodyPreview = "[redacted for auth route]";
      } else {
        responseBodyPreview = stringifyForLog(body);
      }
    } catch {
      responseBodyPreview = "[unserializable]";
    }
    return origJson(body);
  }) as Response["json"];

  res.on("finish", () => {
    const duration = Date.now() - start;
    const method = req.method;
    const path = req.originalUrl || req.url;
    const status = res.statusCode;

    // Simple dev-friendly line in the terminal
    const base = `[${status}] ${method} ${path} - ${duration}ms`;
    const preview = responseBodyPreview ? ` | body: ${responseBodyPreview}` : "";

    // eslint-disable-next-line no-console
    console.log(base + preview);
  });

  next();
}

