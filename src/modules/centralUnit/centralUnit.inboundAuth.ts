import { getEnv } from "../../config/env.js";
import { ERROR_CODES } from "../../config/constants.js";
import type { Request } from "express";
import type { AppError } from "../../types/errors.js";

function makeError(status: number, code: string, message: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = status;
  err.code = code;
  err.expose = true;
  return err;
}

export function enforceCentralUnitInboundAuth(req: Request): void {
  const env = getEnv();
  const tlsSocket = req.socket as import("node:tls").TLSSocket;

  if (env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "off") return;

  if (env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "proxy") {
    const headerName = env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER.toLowerCase();
    const v = req.headers[headerName];
    if (v !== "true") {
      throw makeError(401, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit auth failed");
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

