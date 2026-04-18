import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { JwtPayload, VerifyOptions } from "jsonwebtoken";
import { getEnv } from "../config/env.js";
import {
  extractBearerToken,
  normalizeJwtRole,
  normalizeJwtSubject,
} from "../shared/security/auth-token.js";
import type { AppError } from "../types/errors.js";

function buildAccessVerifyOptions(env: ReturnType<typeof getEnv>): VerifyOptions {
  const verifyOptions: VerifyOptions = {
    algorithms: ["HS256"],
  };

  if (env.JWT_ISSUER) {
    verifyOptions.issuer = env.JWT_ISSUER;
  }
  if (env.JWT_AUDIENCE) {
    verifyOptions.audience = env.JWT_AUDIENCE;
  }

  return verifyOptions;
}

function makeAppError(message: string, statusCode: number, code: string, expose: boolean): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  err.expose = expose;
  return err;
}

function isJwtPayload(payload: string | JwtPayload): payload is JwtPayload {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload);
}

function decodeAccessTokenOrThrow(token: string): { userId: string; userRole: string | null } {
  const env = getEnv();

  if (!env.JWT_ACCESS_SECRET) {
    throw makeAppError("JWT_ACCESS_SECRET not configured", 500, "INTERNAL_ERROR", false);
  }

  const payload = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
    buildAccessVerifyOptions(env)
  );

  if (!isJwtPayload(payload)) {
    throw makeAppError("Invalid access token", 401, "UNAUTHORIZED", true);
  }

  const accessPayload: JwtPayload & { tokenUse?: unknown; role?: unknown } = payload;

  if (accessPayload.tokenUse !== "access") {
    throw makeAppError("Invalid access token", 401, "UNAUTHORIZED", true);
  }

  const userId = normalizeJwtSubject(accessPayload.sub);

  if (!userId) {
    throw makeAppError("Invalid access token", 401, "UNAUTHORIZED", true);
  }

  const userRole = normalizeJwtRole(accessPayload.role);

  return {
    userId,
    userRole,
  };
}

function mapJwtError(err: AppError): AppError {
  if (err?.name === "JsonWebTokenError") {
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    err.message = "Invalid access token";
    err.expose = true;
  } else if (err?.name === "TokenExpiredError") {
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    err.message = "Access token expired";
    err.expose = true;
  }

  return err;
}

function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    return error as AppError;
  }
  return makeAppError("Authentication error", 401, "UNAUTHORIZED", true);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw makeAppError("Missing or invalid authorization header", 401, "UNAUTHORIZED", true);
    }

    const { userId, userRole } = decodeAccessTokenOrThrow(token);

    // Attach userId to request for downstream handlers
    req.userId = userId;
    if (userRole === "ADMIN" || userRole === "USER") {
      req.userRole = userRole;
    }

    next();
  } catch (err) {
    next(mapJwtError(toAppError(err)));
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader == null || authHeader === "") {
      return next();
    }

    const token = extractBearerToken(authHeader);

    if (!token) {
      throw makeAppError("Missing or invalid authorization header", 401, "UNAUTHORIZED", true);
    }

    const { userId, userRole } = decodeAccessTokenOrThrow(token);
    req.userId = userId;
    if (userRole === "ADMIN" || userRole === "USER") {
      req.userRole = userRole;
    }

    next();
  } catch (err) {
    // Missing auth remains optional, but invalid provided credentials are rejected.
    next(mapJwtError(toAppError(err)));
  }
}
