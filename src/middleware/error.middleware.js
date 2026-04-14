import { ERROR_CODES } from "../config/constants.js";
import { buildErrorResponse } from "../shared/errors/error-response.js";

export function notFoundMiddleware(req, res) {
  res.status(404).json({
    code: ERROR_CODES.NOT_FOUND,
    message: "Route not found",
    requestId: req.requestId,
  });
}

// eslint-disable-next-line no-unused-vars
export function errorMiddleware(err, req, res, next) {
  const response = buildErrorResponse({
    err,
    requestId: req.requestId,
    nodeEnv: process.env.NODE_ENV,
  });

  res.status(response.status).json(response.body);
}

