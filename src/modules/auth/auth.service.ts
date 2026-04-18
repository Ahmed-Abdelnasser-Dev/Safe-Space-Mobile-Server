import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { sha256Hex, safeEqual } from "../../utils/crypto.js";
import { getEnv } from "../../config/env.js";
import { makeAuthError } from "./domain/auth.errors.js";
import {
  AUTH_ERROR_CODES,
  EMAIL_VERIFICATION_EXPIRY_MS,
} from "./domain/auth.constants.js";
import {
  createAuthTokenService,
  parseTtlToMs,
} from "./application/auth.token-service.js";
import { createAuthSecurityPolicy } from "./application/auth.security-policy.js";
import type { AuthRepo } from "./auth.repo.js";
import type { AuthTokenService } from "./application/auth.token-service.js";
import type { AuthSecurityPolicy } from "./application/auth.security-policy.js";

type AuthService = {
  register: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<{
    user: unknown;
    accessToken: string;
    refreshToken: string;
    message: string;
    emailVerificationToken?: string;
  }>;
  login: (input: {
    email: string;
    password: string;
    deviceId?: string;
    fcmToken?: string;
    ipAddress?: string;
    userAgent?: string;
  }) => Promise<{
    user: { id: string; email: string; fullName: string; emailVerified: boolean };
    accessToken: string;
    refreshToken: string;
  }>;
  refresh: (input: { refreshToken: string }) => Promise<{ accessToken: string; refreshToken: string }>;
  logout: (input: { refreshToken: string }) => Promise<{ ok: true }>;
  updateFcmToken: (input: { userId: string; sessionId: string; fcmToken: string }) => Promise<{ ok: true; fcmToken: string | null }>;
  verifyEmail: (input: { token: string }) => Promise<{
    ok: true;
    message: string;
    user: { id: string; email: string; emailVerified: true };
  }>;
  resendVerificationEmail: (input: { email: string }) => Promise<{ ok: true; message: string; emailVerificationToken?: string }>;
};

export function createAuthService({
  authRepo,
  tokenService,
  securityPolicy,
}: {
  authRepo: AuthRepo;
  tokenService?: AuthTokenService;
  securityPolicy?: AuthSecurityPolicy;
}): AuthService {
  const env = getEnv();
  const accessSecret = env.JWT_ACCESS_SECRET;
  const refreshSecret = env.JWT_REFRESH_SECRET;
  const accessTtl = env.JWT_ACCESS_TTL || "15m";
  const refreshTtl = env.JWT_REFRESH_TTL || "30d";
  const refreshTtlMs = parseTtlToMs(refreshTtl);
  const exposeVerificationToken =
    process.env.EXPOSE_EMAIL_VERIFICATION_TOKEN === "true" &&
    env.NODE_ENV !== "production";

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not configured (JWT_ACCESS_SECRET/JWT_REFRESH_SECRET)");
  }
  if (refreshTtlMs <= 0) {
    throw new Error("Invalid JWT_REFRESH_TTL configuration");
  }

  const authTokenService =
    tokenService ||
    createAuthTokenService({
      accessSecret,
      refreshSecret,
      accessTtl,
      refreshTtl,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });

  const authSecurityPolicy = securityPolicy || createAuthSecurityPolicy();

  return {
    /**
     * @param {{ email: string, password: string, fullName: string, phone?: string }} input
     */
    async register({ email, password, fullName, phone }) {
      const existing = await authRepo.findUserByEmail(email);
      if (existing) {
        throw makeAuthError(409, AUTH_ERROR_CODES.CONFLICT, "User already exists");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await authRepo.createUser({ email, passwordHash, fullName, phone });

      // Generate email verification token
      const verificationToken = randomBytes(32).toString("hex");
      const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
      await authRepo.createEmailVerificationToken(user.id, verificationToken, verificationExpiry);

      // TODO: Send verification email with token
      // For now, we'll return the token in response (REMOVE IN PRODUCTION)
      
      const accessToken = authTokenService.signAccessToken({
        userId: user.id,
        role: user.role,
      });
      // Create an initial session so client can refresh immediately.
      const expiresAt = new Date(Date.now() + refreshTtlMs);
      const session = await authRepo.createSession({
        userId: user.id,
        deviceId: null,
        fcmToken: null,
        refreshTokenHash: "pending",
        expiresAt,
      });

      const refreshToken = authTokenService.signRefreshToken({
        userId: user.id,
        sessionId: session.id,
        role: user.role,
      });
      await authRepo.updateSessionRefreshHash(session.id, sha256Hex(refreshToken));

      const response: {
        user: unknown;
        accessToken: string;
        refreshToken: string;
        message: string;
        emailVerificationToken?: string;
      } = {
        user, 
        accessToken, 
        refreshToken,
        message: "Please verify your email address"
      };

      if (exposeVerificationToken) {
        response.emailVerificationToken = verificationToken;
      }

      return response;
    },

    /**
     * @param {{ email: string, password: string, deviceId?: string, fcmToken?: string, ipAddress?: string, userAgent?: string }} input
     */
    async login({ email, password, deviceId, fcmToken, ipAddress, userAgent }) {
      const user = await authRepo.findUserByEmail(email);
      const lockedUntil = user?.accountLockedUntil;
      
      // Check if account is locked
      if (lockedUntil && authSecurityPolicy.isAccountLocked(lockedUntil)) {
          const remainingMinutes = authSecurityPolicy.getLockRemainingMinutes(
            lockedUntil
          );
          throw makeAuthError(
            403,
            AUTH_ERROR_CODES.ACCOUNT_LOCKED,
            `Account is locked. Try again in ${remainingMinutes} minutes`
          );
      } else if (lockedUntil && user) {
          // Lock has expired, unlock the account
          await authRepo.unlockUserAccount(user.id);
      }

      // Validate credentials
      if (!user) {
        // Record failed attempt even for non-existent users (don't reveal if user exists)
        await authRepo.recordLoginAttempt({
          userId: null,
          email,
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
          successful: false,
        });
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid credentials");
      }

      const ok = await bcrypt.compare(password, user.passwordHash || "");
      
      if (!ok) {
        // Record failed attempt
        await authRepo.recordLoginAttempt({
          userId: user.id,
          email,
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
          successful: false,
        });

        // Check if we should lock the account
        const sinceDate = authSecurityPolicy.computeAttemptWindowStart();
        const failedAttempts = await authRepo.getRecentFailedLoginAttempts(email, sinceDate);

        if (failedAttempts >= authSecurityPolicy.maxFailedAttempts) {
          const lockUntil = authSecurityPolicy.computeLockUntil();
          await authRepo.lockUserAccount(user.id, lockUntil);
          throw makeAuthError(
            403,
            AUTH_ERROR_CODES.ACCOUNT_LOCKED,
            `Too many failed login attempts. Account locked for ${authSecurityPolicy.accountLockDurationMs / 60000} minutes`
          );
        }

        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid credentials");
      }

      // Successful login - record it
      await authRepo.recordLoginAttempt({
        userId: user.id,
        email,
        ipAddress: ipAddress || "unknown",
        userAgent: userAgent || "unknown",
        successful: true,
      });

      const accessToken = authTokenService.signAccessToken({
        userId: user.id,
        role: user.role,
      });
      const expiresAt = new Date(Date.now() + refreshTtlMs);
      const session = await authRepo.createSession({
        userId: user.id,
        deviceId,
        fcmToken,
        refreshTokenHash: "pending",
        expiresAt,
      });
      const refreshToken = authTokenService.signRefreshToken({
        userId: user.id,
        sessionId: session.id,
        role: user.role,
      });
      await authRepo.updateSessionRefreshHash(session.id, sha256Hex(refreshToken));

      return {
        user: { 
          id: user.id, 
          email: user.email, 
          fullName: user.fullName,
          emailVerified: user.emailVerified 
        },
        accessToken,
        refreshToken,
      };
    },

    /** @param {{ refreshToken: string }} input */
    async refresh({ refreshToken }) {
      let payload;
      try {
        payload = authTokenService.verifyRefreshToken(refreshToken);
      } catch {
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
      }

      if (typeof payload === "string") {
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
      }

      const userId = typeof payload.sub === "string" ? payload.sub : null;
      const sessionId = typeof payload.sid === "string" ? payload.sid : null;
      if (!userId || !sessionId) {
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
      }

      const session = await authRepo.findSessionById(sessionId);
      if (!session) {
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
      }

      const presentedHash = sha256Hex(refreshToken);
      if (!safeEqual(session.refreshTokenHash, presentedHash)) {
        // Potential token theft or mismatched token
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
      }

      if (session.revokedAt) {
        // Reuse detected -> revoke all sessions for user
        await authRepo.revokeAllUserSessions(userId);
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Refresh token reuse detected");
      }

      if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
        await authRepo.revokeSession(sessionId);
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Refresh token expired");
      }

      const currentUser = await authRepo.findUserById(userId);
      if (!currentUser) {
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Invalid refresh token");
      }

      // rotate
      await authRepo.revokeSession(sessionId);
      const accessToken = authTokenService.signAccessToken({
        userId,
        role: currentUser.role,
      });
      const expiresAt = new Date(Date.now() + refreshTtlMs);
      const newSession = await authRepo.createSession({
        userId,
        deviceId: session.deviceId,
        fcmToken: session.fcmToken,
        refreshTokenHash: "pending",
        expiresAt,
      });
      const newRefreshToken = authTokenService.signRefreshToken({
        userId,
        sessionId: newSession.id,
        role: currentUser.role,
      });
      await authRepo.updateSessionRefreshHash(newSession.id, sha256Hex(newRefreshToken));

      return { accessToken, refreshToken: newRefreshToken };
    },

    /** @param {{ refreshToken: string }} input */
    async logout({ refreshToken }) {
      let payload;
      try {
        payload = authTokenService.verifyRefreshToken(refreshToken);
      } catch {
        return { ok: true };
      }

      if (typeof payload === "string") {
        return { ok: true };
      }

      const sessionId = typeof payload.sid === "string" ? payload.sid : null;
      if (sessionId) {
        try {
          await authRepo.revokeSession(sessionId);
        } catch {
          // ignore
        }
      }
      return { ok: true };
    },

    /** @param {{ userId: string, sessionId: string, fcmToken: string }} input */
    async updateFcmToken({ userId, sessionId, fcmToken }) {
      const session = await authRepo.findSessionById(sessionId);
      if (!session) {
        throw makeAuthError(404, AUTH_ERROR_CODES.NOT_FOUND, "Session not found");
      }

      if (session.userId !== userId) {
        throw makeAuthError(404, AUTH_ERROR_CODES.NOT_FOUND, "Session not found");
      }

      if (session.revokedAt) {
        throw makeAuthError(401, AUTH_ERROR_CODES.UNAUTHORIZED, "Session has been revoked");
      }

      const updated = await authRepo.updateSessionFcmToken(sessionId, fcmToken);
      return { ok: true, fcmToken: updated.fcmToken };
    },

    /** @param {{ token: string }} input */
    async verifyEmail({ token }) {
      const user = await authRepo.findUserByVerificationToken(token);
      
      if (!user) {
        throw makeAuthError(400, AUTH_ERROR_CODES.INVALID_TOKEN, "Invalid or expired verification token");
      }

      if (user.emailVerificationExpires && new Date(user.emailVerificationExpires) < new Date()) {
        throw makeAuthError(400, AUTH_ERROR_CODES.TOKEN_EXPIRED, "Verification token has expired");
      }

      if (user.emailVerified) {
        throw makeAuthError(400, AUTH_ERROR_CODES.ALREADY_VERIFIED, "Email already verified");
      }

      await authRepo.markEmailAsVerified(user.id);

      return { 
        ok: true, 
        message: "Email verified successfully",
        user: {
          id: user.id,
          email: user.email,
          emailVerified: true
        }
      };
    },

    /** @param {{ email: string }} input */
    async resendVerificationEmail({ email }) {
      const user = await authRepo.findUserByEmail(email);
      const genericResponse: { ok: true; message: string } = {
        ok: true,
        message: "If the email exists, a verification link has been sent",
      };
      
      if (!user) {
        // Don't reveal if email exists
        return genericResponse;
      }

      if (user.emailVerified) {
        return genericResponse;
      }

      // Generate new verification token
      const verificationToken = randomBytes(32).toString("hex");
      const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
      await authRepo.createEmailVerificationToken(user.id, verificationToken, verificationExpiry);

      // TODO: Send verification email

      const response: {
        ok: true;
        message: string;
        emailVerificationToken?: string;
      } = {
        ok: true,
        message: genericResponse.message,
      };

      if (exposeVerificationToken) {
        response.emailVerificationToken = verificationToken;
      }

      return response;
    },
  };
}

