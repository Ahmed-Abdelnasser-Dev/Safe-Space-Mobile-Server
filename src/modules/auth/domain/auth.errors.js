/**
 * @param {number} statusCode
 * @param {string} code
 * @param {string} message
 * @returns {import("../../../types/errors").AppError}
 */
export function makeAuthError(statusCode, code, message) {
  /** @type {import("../../../types/errors").AppError} */
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.expose = true;
  return err;
}
