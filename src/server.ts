import http from "node:http";
import https from "node:https";
import type { Express } from "express";

import { createApp } from "./app.js";
import { getEnv, readFileIfExists } from "./config/env.js";
import { logger } from "./utils/logger.js";

type RuntimeEnv = ReturnType<typeof getEnv>;

function createServer(app: Express, env: RuntimeEnv): http.Server | https.Server {
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

