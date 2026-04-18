const AUTH_ENV_KEYS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

let envSnapshot = {};

beforeAll(() => {
  envSnapshot = Object.fromEntries(AUTH_ENV_KEYS.map((key) => [key, process.env[key]]));

  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
});

afterAll(() => {
  for (const key of AUTH_ENV_KEYS) {
    if (typeof envSnapshot[key] === "undefined") {
      delete process.env[key];
      continue;
    }
    process.env[key] = envSnapshot[key];
  }
});

function createAuthRepoStub(session) {
  return {
    createUser: jest.fn(),
    findUserByEmail: jest.fn(),
    findUserById: jest.fn(),
    createSession: jest.fn(),
    updateSessionRefreshHash: jest.fn(),
    updateSessionFcmToken: jest.fn().mockResolvedValue({ fcmToken: "new-token" }),
    findSessionById: jest.fn().mockResolvedValue(session),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    recordLoginAttempt: jest.fn(),
    getRecentFailedLoginAttempts: jest.fn(),
    lockUserAccount: jest.fn(),
    unlockUserAccount: jest.fn(),
    createEmailVerificationToken: jest.fn(),
    findUserByVerificationToken: jest.fn(),
    markEmailAsVerified: jest.fn(),
  };
}

test("updateFcmToken denies updates for session owner mismatch", async () => {
  const { createAuthService } = await import("../../src/modules/auth/auth.service.js");

  const authRepo = createAuthRepoStub({
    id: "session-1",
    userId: "owner-1",
    revokedAt: null,
  });

  const service = createAuthService({ authRepo });

  await expect(
    service.updateFcmToken({ userId: "attacker-1", sessionId: "session-1", fcmToken: "new-token" })
  ).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });

  expect(authRepo.updateSessionFcmToken).not.toHaveBeenCalled();
});

test("updateFcmToken updates token when session belongs to user", async () => {
  const { createAuthService } = await import("../../src/modules/auth/auth.service.js");

  const authRepo = createAuthRepoStub({
    id: "session-1",
    userId: "owner-1",
    revokedAt: null,
  });

  const service = createAuthService({ authRepo });

  await expect(
    service.updateFcmToken({ userId: "owner-1", sessionId: "session-1", fcmToken: "new-token" })
  ).resolves.toEqual({ ok: true, fcmToken: "new-token" });

  expect(authRepo.updateSessionFcmToken).toHaveBeenCalledWith("session-1", "new-token");
});
