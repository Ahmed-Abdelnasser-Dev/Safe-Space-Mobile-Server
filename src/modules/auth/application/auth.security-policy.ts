import {
  ACCOUNT_LOCK_DURATION_MS,
  LOGIN_ATTEMPT_WINDOW_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "../domain/auth.constants.js";

export type AuthSecurityPolicy = {
  maxFailedAttempts: number;
  accountLockDurationMs: number;
  loginAttemptWindowMs: number;
  isAccountLocked: (accountLockedUntil: Date | string | null | undefined) => boolean;
  getLockRemainingMinutes: (accountLockedUntil: Date | string) => number;
  computeLockUntil: () => Date;
  computeAttemptWindowStart: () => Date;
};

export function createAuthSecurityPolicy(): AuthSecurityPolicy {
  return {
    maxFailedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
    accountLockDurationMs: ACCOUNT_LOCK_DURATION_MS,
    loginAttemptWindowMs: LOGIN_ATTEMPT_WINDOW_MS,

    isAccountLocked(accountLockedUntil: Date | string | null | undefined): boolean {
      if (!accountLockedUntil) {
        return false;
      }
      return new Date(accountLockedUntil) > new Date();
    },

    getLockRemainingMinutes(accountLockedUntil: Date | string): number {
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
