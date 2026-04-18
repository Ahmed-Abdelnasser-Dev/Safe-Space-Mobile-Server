import express from "express";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import path from "path";
import type { Express, RequestHandler } from "express";

import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware.js";

import { createRoutes } from "./routes.js";

type RoutesDeps = Parameters<typeof createRoutes>[0];

export function createApp(deps: RoutesDeps = {}): Express {
  const app = express();
  app.disable("x-powered-by");

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((v) => v.trim()).filter(Boolean)
    : process.env.NODE_ENV === "production"
    ? false
    : true;

  app.use(requestIdMiddleware);

  // Human-readable dev logging line per request
  app.use(requestLoggerMiddleware);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: corsOrigin !== false,
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

  const healthHandler: RequestHandler = (_req, res) => res.json({ ok: true });

  app.get("/health", healthHandler);
  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(createRoutes(deps));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
