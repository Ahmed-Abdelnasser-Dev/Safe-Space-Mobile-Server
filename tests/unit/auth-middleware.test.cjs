const jwt = require("jsonwebtoken");

beforeAll(() => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
});

test("requireAuth rejects missing bearer header", async () => {
  const { requireAuth } = await import("../../src/middleware/auth.middleware.js");

  const req = { headers: {} };
  const res = {};
  const next = jest.fn();

  requireAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
});

test("requireAuth accepts valid token and sets req.userId", async () => {
  const { requireAuth } = await import("../../src/middleware/auth.middleware.js");

  const token = jwt.sign({ sub: " user-123 ", role: " admin ", tokenUse: "access" }, process.env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = jest.fn();

  requireAuth(req, res, next);

  expect(next).toHaveBeenCalledWith();
  expect(req.userId).toBe("user-123");
  expect(req.userRole).toBe("ADMIN");
});

test("requireAuth rejects token with invalid issuer when issuer is configured", async () => {
  const { requireAuth } = await import("../../src/middleware/auth.middleware.js");

  process.env.JWT_ISSUER = "trusted-issuer";
  const token = jwt.sign({ sub: "user-123" }, process.env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
    issuer: "other-issuer",
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = jest.fn();

  requireAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
  delete process.env.JWT_ISSUER;
});

test("requireAuth rejects token with invalid audience when audience is configured", async () => {
  const { requireAuth } = await import("../../src/middleware/auth.middleware.js");

  process.env.JWT_AUDIENCE = "mobile-client";
  const token = jwt.sign({ sub: "user-123", aud: "admin-client" }, process.env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = jest.fn();

  requireAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
  delete process.env.JWT_AUDIENCE;
});

test("requireAuth rejects token missing subject", async () => {
  const { requireAuth } = await import("../../src/middleware/auth.middleware.js");

  const token = jwt.sign({ role: "user" }, process.env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = jest.fn();

  requireAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
  expect(err.message).toBe("Invalid access token");
});

test("requireAuth rejects token with refresh tokenUse", async () => {
  const { requireAuth } = await import("../../src/middleware/auth.middleware.js");

  const token = jwt.sign(
    { sub: "user-123", tokenUse: "refresh" },
    process.env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "5m",
    }
  );

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = jest.fn();

  requireAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
  expect(err.message).toBe("Invalid access token");
});

test("optionalAuth rejects invalid authorization header", async () => {
  const { optionalAuth } = await import("../../src/middleware/auth.middleware.js");

  const req = { headers: { authorization: "Bearer bad.token.value" } };
  const res = {};
  const next = jest.fn();

  optionalAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
  expect(req.userId).toBeUndefined();
  expect(req.userRole).toBeUndefined();
});

test("optionalAuth rejects malformed authorization header", async () => {
  const { optionalAuth } = await import("../../src/middleware/auth.middleware.js");

  const req = { headers: { authorization: "Basic abc123" } };
  const res = {};
  const next = jest.fn();

  optionalAuth(req, res, next);

  const err = next.mock.calls[0][0];
  expect(err.statusCode).toBe(401);
  expect(err.code).toBe("UNAUTHORIZED");
});

test("optionalAuth populates auth context when token is valid", async () => {
  const { optionalAuth } = await import("../../src/middleware/auth.middleware.js");

  const token = jwt.sign(
    { sub: "user-123", role: "user", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "5m",
    }
  );

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  const next = jest.fn();

  optionalAuth(req, res, next);

  expect(next).toHaveBeenCalledWith();
  expect(req.userId).toBe("user-123");
  expect(req.userRole).toBe("USER");
});
