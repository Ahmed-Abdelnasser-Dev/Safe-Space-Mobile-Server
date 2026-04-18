import jwt from "jsonwebtoken";
import type { JwtPayload, SignOptions, VerifyOptions } from "jsonwebtoken";

type AuthTokenServiceInput = {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string | number;
  refreshTtl: string | number;
  issuer?: string;
  audience?: string;
};

export type AuthTokenService = {
  signAccessToken: (input: { userId: string; role?: string }) => string;
  signRefreshToken: (input: { userId: string; sessionId: string; role?: string }) => string;
  verifyRefreshToken: (token: string) => JwtPayload | string;
};

export function parseTtlToMs(ttl: unknown): number {
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
}: AuthTokenServiceInput): AuthTokenService {
  const accessTtlMs = parseTtlToMs(accessTtl);
  const refreshTtlMs = parseTtlToMs(refreshTtl);

  if (accessTtlMs <= 0 || refreshTtlMs <= 0) {
    throw new Error("Invalid JWT TTL configuration");
  }

  const signOptions: SignOptions = {};
  if (issuer) signOptions.issuer = issuer;
  if (audience) signOptions.audience = audience;

  const strictRefreshTokenUse = process.env.STRICT_REFRESH_TOKEN_USE === "true";

  function buildRoleClaim(role: unknown): { role?: string } {
    if (typeof role !== "string") return {};
    const normalized = role.trim().toUpperCase();
    return normalized ? { role: normalized } : {};
  }

  function toJwtExpiresIn(ttl: string | number): SignOptions["expiresIn"] {
    if (typeof ttl === "number") {
      return ttl;
    }

    if (/^\d+$/.test(ttl)) {
      return ttl as SignOptions["expiresIn"];
    }

    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error("Invalid JWT TTL configuration");
    }

    return `${match[1]}${match[2]}` as SignOptions["expiresIn"];
  }

  function signAccessToken({ userId, role }: { userId: string; role?: string }): string {
    return jwt.sign(
      { sub: userId, tokenUse: "access", ...buildRoleClaim(role) },
      accessSecret,
      {
        ...signOptions,
        expiresIn: toJwtExpiresIn(accessTtl),
        algorithm: "HS256",
      }
    );
  }

  function signRefreshToken({
    userId,
    sessionId,
    role,
  }: {
    userId: string;
    sessionId: string;
    role?: string;
  }): string {
    return jwt.sign(
      {
        sub: userId,
        sid: sessionId,
        tokenUse: "refresh",
        ...buildRoleClaim(role),
      },
      refreshSecret,
      {
        ...signOptions,
        expiresIn: toJwtExpiresIn(refreshTtl),
        algorithm: "HS256",
      }
    );
  }

  function isJwtPayload(payload: unknown): payload is JwtPayload {
    return typeof payload === "object" && payload !== null && !Array.isArray(payload);
  }

  function verifyRefreshToken(token: string): JwtPayload | string {
    const verifyOptions: VerifyOptions = {
      algorithms: ["HS256"],
    };

    if (issuer) verifyOptions.issuer = issuer;
    if (audience) verifyOptions.audience = audience;

    const payload = jwt.verify(token, refreshSecret, verifyOptions);

    if (!isJwtPayload(payload)) {
      throw new Error("Invalid token payload");
    }

    const typedPayload = payload as JwtPayload & {
      tokenUse?: unknown;
      sid?: unknown;
    };

    if (typedPayload.tokenUse === "refresh") {
      return typedPayload;
    }

    // Compatibility window for refresh tokens minted before tokenUse claim existed.
    if (!strictRefreshTokenUse && !typedPayload.tokenUse && typeof typedPayload.sid === "string" && typedPayload.sid) {
      return typedPayload;
    }

    if (typedPayload.tokenUse !== "refresh") {
      throw new Error("Invalid token type");
    }

    return typedPayload;
  }

  return {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
  };
}
