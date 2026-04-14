test("security policy detects active account lock", async () => {
  const { createAuthSecurityPolicy } = await import("../../src/modules/auth/application/auth.security-policy.js");

  const policy = createAuthSecurityPolicy();
  const lockUntil = new Date(Date.now() + 60000);

  expect(policy.isAccountLocked(lockUntil)).toBe(true);
  expect(policy.getLockRemainingMinutes(lockUntil)).toBeGreaterThan(0);
});

test("security policy computes lock and attempt windows", async () => {
  const { createAuthSecurityPolicy } = await import("../../src/modules/auth/application/auth.security-policy.js");

  const policy = createAuthSecurityPolicy();
  const lockUntil = policy.computeLockUntil();
  const attemptStart = policy.computeAttemptWindowStart();

  expect(lockUntil.getTime()).toBeGreaterThan(Date.now());
  expect(attemptStart.getTime()).toBeLessThan(Date.now());
});
