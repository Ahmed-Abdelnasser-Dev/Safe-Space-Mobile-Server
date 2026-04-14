export function makeAuthError(statusCode, code, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.expose = true;
  return err;
}
