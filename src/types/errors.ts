export interface AppError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  expose?: boolean;
  details?: unknown;
  issues?: Array<{
    path?: unknown[];
    message?: string;
  }>;
}

export function isAppError(error: unknown): error is AppError {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as AppError;

  return (
    typeof candidate.statusCode === "number" ||
    typeof candidate.status === "number" ||
    typeof candidate.code === "string" ||
    candidate.expose === true ||
    typeof candidate.details !== "undefined" ||
    Array.isArray(candidate.issues)
  );
}
