const BEARER_PREFIX = "Bearer ";
const MAX_TOKEN_LENGTH = 4096;

export function extractBearerToken(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== "string") return null;
  if (!authorizationHeader.startsWith(BEARER_PREFIX)) return null;

  const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) return null;
  if (token.length > MAX_TOKEN_LENGTH) return null;
  if (/\s/.test(token)) return null;

  return token;
}

export function isValidJwtSubject(sub: unknown): boolean {
  return typeof sub === "string" && sub.trim().length > 0 && sub.length <= 128;
}

export function normalizeJwtSubject(sub: unknown): string | null {
  if (typeof sub !== "string") return null;
  const normalized = sub.trim();
  if (!normalized || normalized.length > 128) return null;
  return normalized;
}

export function normalizeJwtRole(role: unknown): string | null {
  if (typeof role !== "string") return null;
  const normalized = role.trim().toUpperCase();
  if (!normalized || normalized.length > 32) return null;
  return normalized;
}
