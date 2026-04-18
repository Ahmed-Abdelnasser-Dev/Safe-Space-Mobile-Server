import type { AppError } from "../../../types/errors.js";

export function makeAuthError(statusCode: number, code: string, message: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  err.expose = true;
  return err;
}
