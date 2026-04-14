import { getEnv } from "../../config/env.js";
import { ERROR_CODES } from "../../config/constants.js";

/** @typedef {import("../../types/errors").AppError} AppError */

/**
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @returns {AppError}
 */
function makeError(status, code, message) {
  /** @type {AppError} */
  const err = new Error(message);
  err.statusCode = status;
  err.code = code;
  err.expose = true;
  return err;
}

/**
 * @param {import("express").Request} req
 */
export function enforceCentralUnitInboundAuth(req) {
  const env = getEnv();

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
  if (!req.client || req.client.authorized !== true) {
    throw makeError(401, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit mTLS required");
  }

  const allowedCn = env.CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN;
  if (allowedCn) {
    const cert = req.socket.getPeerCertificate?.();
    const cn = cert?.subject?.CN;
    if (!cn || cn !== allowedCn) {
      throw makeError(403, ERROR_CODES.CENTRAL_UNIT_AUTH_FAILED, "Central Unit client cert not allowed");
    }
  }
}

