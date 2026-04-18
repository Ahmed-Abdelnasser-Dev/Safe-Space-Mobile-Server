const jwt = require("jsonwebtoken");

test("parseTtlToMs parses duration values", async () => {
  const { parseTtlToMs } = await import("../../src/modules/auth/application/auth.token-service.js");

  expect(parseTtlToMs("15m")).toBe(900000);
  expect(parseTtlToMs("2h")).toBe(7200000);
  expect(parseTtlToMs("1000")).toBe(1000);
});

test("token service signs and verifies refresh token with trust claims", async () => {
  const { createAuthTokenService } = await import("../../src/modules/auth/application/auth.token-service.js");

  const tokenService = createAuthTokenService({
    accessSecret: "access-secret",
    refreshSecret: "refresh-secret",
    accessTtl: "15m",
    refreshTtl: "30d",
    issuer: "safespace",
    audience: "mobile-client",
  });

  const refreshToken = tokenService.signRefreshToken({ userId: "u1", sessionId: "s1" });
  const payload = tokenService.verifyRefreshToken(refreshToken);

  expect(payload.sub).toBe("u1");
  expect(payload.sid).toBe("s1");
});

test("token service signs access and refresh role claims", async () => {
  const { createAuthTokenService } = await import("../../src/modules/auth/application/auth.token-service.js");

  const tokenService = createAuthTokenService({
    accessSecret: "access-secret",
    refreshSecret: "refresh-secret",
    accessTtl: "15m",
    refreshTtl: "30d",
  });

  const accessToken = tokenService.signAccessToken({ userId: "u1", role: "admin" });
  const decodedAccess = jwt.verify(accessToken, "access-secret", {
    algorithms: ["HS256"],
  });
  expect(decodedAccess.role).toBe("ADMIN");

  const refreshToken = tokenService.signRefreshToken({ userId: "u1", sessionId: "s1", role: "admin" });
  const decodedRefresh = tokenService.verifyRefreshToken(refreshToken);
  expect(decodedRefresh.role).toBe("ADMIN");
});

test("token service rejects non-refresh tokens", async () => {
  const { createAuthTokenService } = await import("../../src/modules/auth/application/auth.token-service.js");

  const tokenService = createAuthTokenService({
    accessSecret: "access-secret",
    refreshSecret: "refresh-secret",
    accessTtl: "15m",
    refreshTtl: "30d",
  });

  const badToken = jwt.sign({ sub: "u1", sid: "s1", tokenUse: "access" }, "refresh-secret", {
    algorithm: "HS256",
    expiresIn: "30d",
  });

  expect(() => tokenService.verifyRefreshToken(badToken)).toThrow();
});

test("token service accepts legacy refresh token without tokenUse by default", async () => {
  const { createAuthTokenService } = await import("../../src/modules/auth/application/auth.token-service.js");

  const tokenService = createAuthTokenService({
    accessSecret: "access-secret",
    refreshSecret: "refresh-secret",
    accessTtl: "15m",
    refreshTtl: "30d",
  });

  const legacyToken = jwt.sign({ sub: "u1", sid: "s1" }, "refresh-secret", {
    algorithm: "HS256",
    expiresIn: "30d",
  });

  const payload = tokenService.verifyRefreshToken(legacyToken);
  expect(payload.sub).toBe("u1");
  expect(payload.sid).toBe("s1");
});

test("token service rejects legacy refresh token when strict mode is enabled", async () => {
  const { createAuthTokenService } = await import("../../src/modules/auth/application/auth.token-service.js");

  process.env.STRICT_REFRESH_TOKEN_USE = "true";
  const tokenService = createAuthTokenService({
    accessSecret: "access-secret",
    refreshSecret: "refresh-secret",
    accessTtl: "15m",
    refreshTtl: "30d",
  });

  const legacyToken = jwt.sign({ sub: "u1", sid: "s1" }, "refresh-secret", {
    algorithm: "HS256",
    expiresIn: "30d",
  });

  expect(() => tokenService.verifyRefreshToken(legacyToken)).toThrow();
  delete process.env.STRICT_REFRESH_TOKEN_USE;
});

test("token service fails fast on invalid ttl configuration", async () => {
  const { createAuthTokenService } = await import("../../src/modules/auth/application/auth.token-service.js");

  expect(() =>
    createAuthTokenService({
      accessSecret: "access-secret",
      refreshSecret: "refresh-secret",
      accessTtl: "invalid",
      refreshTtl: "30d",
    })
  ).toThrow("Invalid JWT TTL configuration");
});
