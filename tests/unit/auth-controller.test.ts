function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createAuthServiceStub() {
  return {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    updateFcmToken: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  };
}

test("updateFcmToken requires authenticated user", async () => {
  const { createAuthController } = await import("../../src/modules/auth/auth.controller.js");
  const authService = createAuthServiceStub();
  const controller = createAuthController({ authService });

  const req = {
    userId: undefined,
    body: {
      sessionId: "session-1",
      fcmToken: "token-1",
    },
  };
  const res = createRes();
  const next = jest.fn();

  await controller.updateFcmToken(req, res, next);

  expect(authService.updateFcmToken).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledTimes(1);
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
});

test("updateFcmToken forwards authenticated user context to service", async () => {
  const { createAuthController } = await import("../../src/modules/auth/auth.controller.js");
  const authService = createAuthServiceStub();
  authService.updateFcmToken.mockResolvedValue({ ok: true, fcmToken: "token-1" });
  const controller = createAuthController({ authService });

  const req = {
    userId: "user-1",
    body: {
      sessionId: "11111111-1111-4111-8111-111111111111",
      fcmToken: "token-1",
    },
  };
  const res = createRes();
  const next = jest.fn();

  await controller.updateFcmToken(req, res, next);

  expect(authService.updateFcmToken).toHaveBeenCalledWith({
    userId: "user-1",
    sessionId: "11111111-1111-4111-8111-111111111111",
    fcmToken: "token-1",
  });
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true, fcmToken: "token-1" });
  expect(next).not.toHaveBeenCalled();
});
