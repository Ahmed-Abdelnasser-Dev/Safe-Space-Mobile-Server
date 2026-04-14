import {
  ACCOUNT_LOCK_DURATION_MS,
  LOGIN_ATTEMPT_WINDOW_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "../domain/auth.constants.js";

/**
 * @returns {{
 *   maxFailedAttempts: number,
 *   accountLockDurationMs: number,
 *   loginAttemptWindowMs: number,
 *   isAccountLocked: (accountLockedUntil: Date | string | null | undefined) => boolean,
 *   getLockRemainingMinutes: (accountLockedUntil: Date | string) => number,
 *   computeLockUntil: () => Date,
 *   computeAttemptWindowStart: () => Date
 * }}
 */
export function createAuthSecurityPolicy() {
  return {
    maxFailedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    accountLockDurationMs: ACCOUNT_LOCK_DURATION_MS,
    loginAttemptWindowMs: LOGIN_ATTEMPT_WINDOW_MS,

    /** @param {Date | string | null | undefined} accountLockedUntil */
    isAccountLocked(accountLockedUntil) {
      return Boolean(accountLockedUntil) && new Date(accountLockedUntil) > new Date();
    },

    /** @param {Date | string} accountLockedUntil */
    getLockRemainingMinutes(accountLockedUntil) {
      return Math.ceil((new Date(accountLockedUntil).getTime() - Date.now()) / 60000);
    },

    computeLockUntil() {
      return new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
    },

    computeAttemptWindowStart() {
      return new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MS);
    },
  };
}
