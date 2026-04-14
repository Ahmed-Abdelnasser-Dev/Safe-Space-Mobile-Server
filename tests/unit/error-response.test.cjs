test("buildErrorResponse returns validation envelope for zod errors", async () => {
  const { buildErrorResponse } = await import("../../src/shared/errors/error-response.js");

  const response = buildErrorResponse({
    err: {
      name: "ZodError",
      issues: [{ path: ["email"], message: "Invalid email" }],
    },
    requestId: "req-1",
    nodeEnv: "test",
  });

  expect(response.status).toBe(400);
  expect(response.body.code).toBe("VALIDATION_ERROR");
  expect(response.body.details).toEqual([{ path: "email", message: "Invalid email" }]);
  expect(response.body.requestId).toBe("req-1");
});

test("buildErrorResponse hides internal messages in production", async () => {
  const { buildErrorResponse } = await import("../../src/shared/errors/error-response.js");

  const response = buildErrorResponse({
    err: { statusCode: 500, message: "db failed", stack: "x" },
    requestId: "req-2",
    nodeEnv: "production",
  });

  expect(response.status).toBe(500);
  expect(response.body.code).toBe("INTERNAL_ERROR");
  expect(response.body.message).toBe("Internal server error");
  expect(response.body.debug).toBeUndefined();
});

test("buildErrorResponse preserves exposed client errors", async () => {
  const { buildErrorResponse } = await import("../../src/shared/errors/error-response.js");

  const response = buildErrorResponse({
    err: { statusCode: 401, code: "UNAUTHORIZED", message: "Invalid access token", expose: true },
    requestId: "req-3",
    nodeEnv: "test",
  });

  expect(response.status).toBe(401);
  expect(response.body.code).toBe("UNAUTHORIZED");
  expect(response.body.message).toBe("Invalid access token");
  expect(response.body.requestId).toBe("req-3");
});

test("buildErrorResponse includes debug only when opt-in flag is enabled", async () => {
  const { buildErrorResponse } = await import("../../src/shared/errors/error-response.js");

  process.env.ENABLE_ERROR_DEBUG = "true";
  const response = buildErrorResponse({
    err: { statusCode: 500, message: "boom", stack: "trace" },
    requestId: "req-4",
    nodeEnv: "test",
  });
  delete process.env.ENABLE_ERROR_DEBUG;

  expect(response.status).toBe(500);
  expect(response.body.debug).toEqual({ message: "boom", stack: "trace" });
});
