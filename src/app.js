import express from "express";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import path from "path";

import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware.js";

import { createRoutes } from "./routes.js";

/** @typedef {Parameters<typeof createRoutes>[0]} RoutesDeps */

/**
 * @param {RoutesDeps} [deps]
 * @returns {import("express").Express}
 */
export function createApp(deps = {}) {
  const app = express();
  app.disable("x-powered-by");

  app.use(requestIdMiddleware);

  // Human-readable dev logging line per request
  app.use(requestLoggerMiddleware);

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : true,
      credentials: true,
    }),
  );
  app.use(hpp());
  app.use(express.json({ limit: "1mb" }));

  // Basic global rate limit (tighten per-route later)
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  /** @type {import("express").RequestHandler} */
  const healthHandler = (req, res) => res.json({ ok: true });

  app.get("/health", healthHandler);
  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(createRoutes(deps));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
