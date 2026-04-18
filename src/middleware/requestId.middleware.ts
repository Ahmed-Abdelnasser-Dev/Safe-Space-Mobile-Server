import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["x-request-id"];
  const requestId = (typeof header === "string" && header.trim()) || randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

