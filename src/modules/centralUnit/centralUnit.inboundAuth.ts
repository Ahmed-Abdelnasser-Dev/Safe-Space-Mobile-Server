import { getEnv } from "../../config/env.js";
import { ERROR_CODES } from "../../config/constants.js";
import { safeEqual } from "../../utils/crypto.js";
import type { Request } from "express";
import type { AppError } from "../../types/errors.js";

function makeError(status: number, code: string, message: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = status;
  err.code = code;
  err.expose = true;
  return err;
}

function readHeaderValue(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    const normalized = value[0].trim();
    return normalized.length > 0 ? normalized : null;
  }
  return null;
}

export function enforceCentralUnitInboundAuth(req: Request): void {
  const env = getEnv();
  const tlsSocket = req.socket as import("node:tls").TLSSocket;

  if (env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "off") return;

  if (env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "proxy") {
    if (env.NODE_ENV !== "test" && !env.CENTRAL_UNIT_PROXY_SHARED_SECRET) {
      throw makeError(500, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit proxy auth misconfigured");
    }

    const headerName = env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER.toLowerCase();
    const verifiedHeaderValue = readHeaderValue(req.headers[headerName]);
    if (verifiedHeaderValue?.toLowerCase() !== "true") {
      throw makeError(401, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit auth failed");
    }

    if (env.CENTRAL_UNIT_PROXY_SHARED_SECRET) {
      const secretHeaderName = env.CENTRAL_UNIT_PROXY_SHARED_SECRET_HEADER.toLowerCase();
      const providedSecret = readHeaderValue(req.headers[secretHeaderName]);
      if (!providedSecret || !safeEqual(providedSecret, env.CENTRAL_UNIT_PROXY_SHARED_SECRET)) {
        throw makeError(401, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit auth failed");
      }
    }

    return;
  }

  // mtls
  if (tlsSocket.authorized !== true) {
    throw makeError(401, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit mTLS required");
  }

  const allowedCn = env.CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN;
  if (allowedCn) {
    const cert = tlsSocket.getPeerCertificate?.();
    const cn = cert?.subject?.CN;
    if (!cn || cn !== allowedCn) {
      throw makeError(403, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit client cert not allowed");
    }
  }
}

