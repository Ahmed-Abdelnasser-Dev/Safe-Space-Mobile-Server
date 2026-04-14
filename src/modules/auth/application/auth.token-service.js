import jwt from "jsonwebtoken";

/**
 * @param {unknown} ttl
 * @returns {number}
 */
export function parseTtlToMs(ttl) {
  if (typeof ttl === "number") return ttl;
  if (/^\d+$/.test(String(ttl))) return Number(ttl);

  const match = String(ttl).match(/^(\d+)([smhd])$/);
  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === "s"
      ? 1000
      : unit === "m"
      ? 60_000
      : unit === "h"
      ? 3_600_000
      : 86_400_000;

  return value * multiplier;
}

/**
 * @param {{
 *   accessSecret: string,
 *   refreshSecret: string,
 *   accessTtl: string | number,
 *   refreshTtl: string | number,
 *   issuer?: string,
 *   audience?: string
 * }} input
 */
export function createAuthTokenService({
  accessSecret,
  refreshSecret,
  accessTtl,
  refreshTtl,
  issuer,
  audience,
}) {
  const accessTtlMs = parseTtlToMs(accessTtl);
  const refreshTtlMs = parseTtlToMs(refreshTtl);

  if (accessTtlMs <= 0 || refreshTtlMs <= 0) {
    throw new Error("Invalid JWT TTL configuration");
  }

  /** @type {import("jsonwebtoken").SignOptions} */
  const signOptions = {};
  if (issuer) signOptions.issuer = issuer;
  if (audience) signOptions.audience = audience;

  const strictRefreshTokenUse = process.env.STRICT_REFRESH_TOKEN_USE === "true";

  /**
   * @param {unknown} role
   * @returns {{ role?: string }}
   */
  function buildRoleClaim(role) {
    if (typeof role !== "string") return {};
    const normalized = role.trim().toUpperCase();
    return normalized ? { role: normalized } : {};
  }

  /**
   * @param {{ userId: string, role?: string }} input
   * @returns {string}
   */
  function signAccessToken({ userId, role }) {
    return jwt.sign(
      { sub: userId, tokenUse: "access", ...buildRoleClaim(role) },
      accessSecret,
      { ...signOptions, expiresIn: accessTtl, algorithm: "HS256" }
    );
  }

  /**
   * @param {{ userId: string, sessionId: string, role?: string }} input
   * @returns {string}
   */
  function signRefreshToken({ userId, sessionId, role }) {
    return jwt.sign(
      {
        sub: userId,
        sid: sessionId,
        tokenUse: "refresh",
        ...buildRoleClaim(role),
      },
      refreshSecret,
      { ...signOptions, expiresIn: refreshTtl, algorithm: "HS256" }
    );
  }

  /**
   * @param {string} token
   * @returns {import("jsonwebtoken").JwtPayload | string}
   */
  function verifyRefreshToken(token) {
    /** @type {import("jsonwebtoken").VerifyOptions} */
    const verifyOptions = {
      algorithms: ["HS256"],
    };

    if (issuer) verifyOptions.issuer = issuer;
    if (audience) verifyOptions.audience = audience;

    const payload = jwt.verify(token, refreshSecret, verifyOptions);

    if (payload?.tokenUse === "refresh") {
      return payload;
    }

    // Compatibility window for refresh tokens minted before tokenUse claim existed.
    if (!strictRefreshTokenUse && !payload?.tokenUse && typeof payload?.sid === "string" && payload.sid) {
      return payload;
    }

    if (payload?.tokenUse !== "refresh") {
      throw new Error("Invalid token type");
    }

    return payload;
  }

  return {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
  };
}
