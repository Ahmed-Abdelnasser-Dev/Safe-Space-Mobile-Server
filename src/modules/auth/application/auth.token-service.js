import jwt from "jsonwebtoken";

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

  const signOptions = {};
  if (issuer) signOptions.issuer = issuer;
  if (audience) signOptions.audience = audience;

  const strictRefreshTokenUse = process.env.STRICT_REFRESH_TOKEN_USE === "true";

  function buildRoleClaim(role) {
    if (typeof role !== "string") return {};
    const normalized = role.trim().toUpperCase();
    return normalized ? { role: normalized } : {};
  }

  function signAccessToken({ userId, role }) {
    return jwt.sign(
      { sub: userId, tokenUse: "access", ...buildRoleClaim(role) },
      accessSecret,
      { ...signOptions, expiresIn: accessTtl, algorithm: "HS256" }
    );
  }

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

  function verifyRefreshToken(token) {
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
