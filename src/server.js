import http from "node:http";
import https from "node:https";

import { createApp } from "./app.js";
import { getEnv, readFileIfExists } from "./config/env.js";
import { logger } from "./utils/logger.js";

/** @typedef {ReturnType<typeof getEnv>} RuntimeEnv */

/**
 * @param {import("express").Express} app
 * @param {RuntimeEnv} env
 * @returns {http.Server | https.Server}
 */
function createServer(app, env) {
  const cert = readFileIfExists(env.TLS_CERT_PATH);
  const key = readFileIfExists(env.TLS_KEY_PATH);
  const ca = readFileIfExists(env.CENTRAL_UNIT_MTLS_CA_CERT_PATH);

  // If TLS certs are provided, run HTTPS (needed for dev mTLS).
  if (cert && key) {
    return https.createServer(
      {
        cert,
        key,
        // Enable client cert verification only if we are in mtls mode and have a CA.
        requestCert: env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "mtls",
        rejectUnauthorized: env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "mtls",
        ca: env.CENTRAL_UNIT_INBOUND_AUTH_MODE === "mtls" ? ca || undefined : undefined,
      },
      app
    );
  }

  // Fallback to plain HTTP (useful behind a TLS-terminating proxy).
  return http.createServer(app);
}

/** @returns {void} */
function main() {
  const env = getEnv();
  const app = createApp();
  const server = createServer(app, env);

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
        inboundAuthMode: env.CENTRAL_UNIT_INBOUND_AUTH_MODE,
        tls: server instanceof https.Server,
      },
      "server listening"
    );
  });
}

main();

