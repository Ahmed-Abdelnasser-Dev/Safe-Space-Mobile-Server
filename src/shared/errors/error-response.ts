import { ERROR_CODES } from "../../config/constants.js";
import type { AppError } from "../../types/errors.js";

type ValidationIssue = { path: string; message: string };
type DebugBody = { message?: string; stack?: string };
type ErrorResponseBody = {
  code: string;
  message: string;
  requestId: string | undefined;
  details?: ValidationIssue[];
  debug?: DebugBody;
};
type ErrorResponse = { status: number; body: ErrorResponseBody };

function normalizeStatus(status: unknown): number {
  const code = Number(status);
  if (!Number.isInteger(code) || code < 400 || code > 599) {
    return 500;
  }
  return code;
}

function buildValidationDetails(err: AppError | undefined | null): ValidationIssue[] {
  if (!Array.isArray(err?.issues)) return [];
  return err.issues.map((issue) => ({
    path: Array.isArray(issue?.path) ? issue.path.join(".") : "",
    message: issue?.message || "Invalid value",
  }));
}

export function buildErrorResponse({
  err,
  requestId,
  nodeEnv,
}: {
  err: AppError | undefined | null;
  requestId: string | undefined;
  nodeEnv: string | undefined;
}): ErrorResponse {
  if (err?.name === "ZodError") {
    return {
      status: 400,
      body: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: "Validation failed",
        details: buildValidationDetails(err),
        requestId,
      },
    };
  }

  const status = normalizeStatus(err?.statusCode ?? err?.status ?? 500);
  const code =
    typeof err?.code === "string" && err.code.length > 0
      ? err.code
      : status >= 500
      ? ERROR_CODES.INTERNAL_ERROR
      : "ERROR";

  const message =
    err?.expose === true
      ? err?.message || "Request failed"
      : status >= 500
      ? "Internal server error"
      : err?.message || "Request failed";

  const body: ErrorResponseBody = {
    code,
    message,
    requestId,
  };

  if (
    nodeEnv !== "production" &&
    process.env.ENABLE_ERROR_DEBUG === "true" &&
    status >= 500
  ) {
    body.debug = {
      message: err?.message || "Unknown error",
      stack: err?.stack,
    };
  }

  return { status, body };
}
