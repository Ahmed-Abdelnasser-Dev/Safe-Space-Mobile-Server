const BEARER_PREFIX = "Bearer ";
const MAX_TOKEN_LENGTH = 4096;

/**
 * @param {unknown} authorizationHeader
 * @returns {string | null}
 */
export function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== "string") return null;
  if (!authorizationHeader.startsWith(BEARER_PREFIX)) return null;

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) return null;
  if (token.length > MAX_TOKEN_LENGTH) return null;
  if (/\s/.test(token)) return null;

  return token;
}

/**
 * @param {unknown} sub
 * @returns {boolean}
 */
export function isValidJwtSubject(sub) {
  return typeof sub === "string" && sub.trim().length > 0 && sub.length <= 128;
}

/**
 * @param {unknown} sub
 * @returns {string | null}
 */
export function normalizeJwtSubject(sub) {
  if (typeof sub !== "string") return null;
  const normalized = sub.trim();
  if (!normalized || normalized.length > 128) return null;
  return normalized;
}

/**
 * @param {unknown} role
 * @returns {string | null}
 */
export function normalizeJwtRole(role) {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toUpperCase();
  if (!normalized || normalized.length > 32) return null;
  return normalized;
}
