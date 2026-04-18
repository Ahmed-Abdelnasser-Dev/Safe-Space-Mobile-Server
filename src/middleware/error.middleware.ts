import { ERROR_CODES } from "../config/constants.js";
import { buildErrorResponse } from "../shared/errors/error-response.js";
import type { Request, Response, NextFunction } from "express";
import type { AppError } from "../types/errors.js";

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    code: ERROR_CODES.NOT_FOUND,
    message: "Route not found",
    requestId: req.requestId,
  });
}

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const response = buildErrorResponse({
    err,
    requestId: req.requestId,
    nodeEnv: process.env.NODE_ENV,
  });

  res.status(response.status).json(response.body);
}

