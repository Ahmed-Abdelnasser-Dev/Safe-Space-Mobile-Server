test("extractBearerToken returns token for valid header", async () => {
  const { extractBearerToken } = await import("../../src/shared/security/auth-token.js");
  expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
});

test("extractBearerToken rejects malformed headers", async () => {
  const { extractBearerToken } = await import("../../src/shared/security/auth-token.js");

  expect(extractBearerToken(undefined)).toBeNull();
  expect(extractBearerToken("Token abc")).toBeNull();
  expect(extractBearerToken("Bearer ")).toBeNull();
  expect(extractBearerToken("Bearer a b")).toBeNull();
});

test("isValidJwtSubject enforces zero-trust subject checks", async () => {
  const { isValidJwtSubject } = await import("../../src/shared/security/auth-token.js");

  expect(isValidJwtSubject("user-1")).toBe(true);
  expect(isValidJwtSubject("")).toBe(false);
  expect(isValidJwtSubject("   ")).toBe(false);
  expect(isValidJwtSubject(null)).toBe(false);
  expect(isValidJwtSubject(123)).toBe(false);
});

test("normalizeJwtSubject returns canonical subject or null", async () => {
  const { normalizeJwtSubject } = await import("../../src/shared/security/auth-token.js");

  expect(normalizeJwtSubject(" user-1 ")).toBe("user-1");
  expect(normalizeJwtSubject("x".repeat(128))).toBe("x".repeat(128));
  expect(normalizeJwtSubject("x".repeat(129))).toBeNull();
  expect(normalizeJwtSubject("   ")).toBeNull();
});
