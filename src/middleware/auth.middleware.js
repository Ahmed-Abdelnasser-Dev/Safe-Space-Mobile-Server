import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";
import {
  extractBearerToken,
  normalizeJwtRole,
  normalizeJwtSubject,
} from "../shared/security/auth-token.js";

function buildAccessVerifyOptions(env) {
  const verifyOptions = {
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

function decodeAccessTokenOrThrow(token) {
  const env = getEnv();

  if (!env.JWT_ACCESS_SECRET) {
    const err = new Error("JWT_ACCESS_SECRET not configured");
    err.statusCode = 500;
    err.code = "INTERNAL_ERROR";
    err.expose = false;
    throw err;
  }

  const payload = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
    buildAccessVerifyOptions(env)
  );

  if (payload?.tokenUse !== "access") {
    const err = new Error("Invalid access token");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    err.expose = true;
    throw err;
  }

  const userId = normalizeJwtSubject(payload?.sub);

  if (!userId) {
    const err = new Error("Invalid access token");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    err.expose = true;
    throw err;
  }

  const userRole = normalizeJwtRole(payload?.role);

  return {
    userId,
    userRole,
  };
}

function mapJwtError(err) {
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

/**
 * Authentication middleware that verifies JWT access token
 * and attaches userId to the request object.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      const err = new Error("Missing or invalid authorization header");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      err.expose = true;
      throw err;
    }

    const { userId, userRole } = decodeAccessTokenOrThrow(token);

    // Attach userId to request for downstream handlers
    req.userId = userId;
    if (userRole) {
      req.userRole = userRole;
    }

    next();
  } catch (err) {
    next(mapJwtError(err));
  }
}

export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader == null || authHeader === "") {
      return next();
    }

    const token = extractBearerToken(authHeader);

    if (!token) {
      const err = new Error("Missing or invalid authorization header");
      err.statusCode = 401;
      err.code = "UNAUTHORIZED";
      err.expose = true;
      throw err;
    }

    const { userId, userRole } = decodeAccessTokenOrThrow(token);
    req.userId = userId;
    if (userRole) {
      req.userRole = userRole;
    }

    next();
  } catch (err) {
    // Missing auth remains optional, but invalid provided credentials are rejected.
    next(mapJwtError(err));
  }
}
