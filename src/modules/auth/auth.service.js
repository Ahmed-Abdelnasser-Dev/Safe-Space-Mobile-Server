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

/**
 * @typedef {{
 *   createUser: (input: { email: string, passwordHash: string, fullName: string, phone?: string }) => Promise<{ id: string, email: string, fullName: string, role: string }>,
 *   findUserByEmail: (email: string) => Promise<any>,
 *   findUserById: (userId: string) => Promise<any>,
 *   createSession: (input: { userId: string, deviceId?: string | null, fcmToken?: string | null, refreshTokenHash: string, expiresAt: Date }) => Promise<{ id: string, userId: string, expiresAt: Date }>,
 *   updateSessionRefreshHash: (sessionId: string, refreshTokenHash: string) => Promise<any>,
 *   updateSessionFcmToken: (sessionId: string, fcmToken: string) => Promise<{ fcmToken: string | null }>,
 *   findSessionById: (sessionId: string) => Promise<any>,
 *   revokeSession: (sessionId: string) => Promise<any>,
 *   revokeAllUserSessions: (userId: string) => Promise<any>,
 *   recordLoginAttempt: (input: { userId?: string | null, email: string, ipAddress: string, userAgent?: string | null, successful: boolean }) => Promise<any>,
 *   getRecentFailedLoginAttempts: (email: string, sinceDate: Date) => Promise<number>,
 *   lockUserAccount: (userId: string, lockUntil: Date) => Promise<any>,
 *   unlockUserAccount: (userId: string) => Promise<any>,
 *   createEmailVerificationToken: (userId: string, token: string, expiresAt: Date) => Promise<any>,
 *   findUserByVerificationToken: (token: string) => Promise<any>,
 *   markEmailAsVerified: (userId: string) => Promise<any>
 * }} AuthRepo
 */

/**
 * @typedef {{
 *   signAccessToken: (input: { userId: string, role?: string }) => string,
 *   signRefreshToken: (input: { userId: string, sessionId: string, role?: string }) => string,
 *   verifyRefreshToken: (token: string) => import("jsonwebtoken").JwtPayload | string
 * }} AuthTokenService
 */

/**
 * @typedef {{
 *   maxFailedAttempts: number,
 *   accountLockDurationMs: number,
 *   loginAttemptWindowMs: number,
 *   isAccountLocked: (accountLockedUntil: Date | string | null | undefined) => boolean,
 *   getLockRemainingMinutes: (accountLockedUntil: Date | string) => number,
 *   computeLockUntil: () => Date,
 *   computeAttemptWindowStart: () => Date
 * }} AuthSecurityPolicy
 */

/**
 * @param {{ authRepo: AuthRepo, tokenService?: AuthTokenService, securityPolicy?: AuthSecurityPolicy }} deps
 */
export function createAuthService({ authRepo, tokenService, securityPolicy }) {
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

      const response = { 
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
      
      // Check if account is locked
      if (authSecurityPolicy.isAccountLocked(user?.accountLockedUntil)) {
          const remainingMinutes = authSecurityPolicy.getLockRemainingMinutes(
            user.accountLockedUntil
          );
          throw makeAuthError(
            403,
            AUTH_ERROR_CODES.ACCOUNT_LOCKED,
            `Account is locked. Try again in ${remainingMinutes} minutes`
          );
      } else if (user?.accountLockedUntil) {
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

      const userId = payload.sub;
      const sessionId = payload.sid;
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
      const sessionId = payload.sid;
      if (sessionId) {
        try {
          await authRepo.revokeSession(sessionId);
        } catch {
          // ignore
        }
      }
      return { ok: true };
    },

    /** @param {{ sessionId: string, fcmToken: string }} input */
    async updateFcmToken({ sessionId, fcmToken }) {
      const session = await authRepo.findSessionById(sessionId);
      if (!session) {
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
      
      if (!user) {
        // Don't reveal if email exists
        return { ok: true, message: "If the email exists, a verification link has been sent" };
      }

      if (user.emailVerified) {
        throw makeAuthError(400, AUTH_ERROR_CODES.ALREADY_VERIFIED, "Email already verified");
      }

      // Generate new verification token
      const verificationToken = randomBytes(32).toString("hex");
      const verificationExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);
      await authRepo.createEmailVerificationToken(user.id, verificationToken, verificationExpiry);

      // TODO: Send verification email

      const response = {
        ok: true,
        message: "Verification email sent",
      };

      if (exposeVerificationToken) {
        response.emailVerificationToken = verificationToken;
      }

      return response;
    },
  };
}

