test("buildEmergencyListOptions denies unauthenticated non-admin listing", async () => {
  const { buildEmergencyListOptions } = await import(
    "../../src/modules/emergency/application/emergency.access-policy.js"
  );

  const result = buildEmergencyListOptions({
    query: { limit: 10, offset: 5, status: "QUEUED" },
    userId: null,
    userRole: "USER",
  });

  expect(result).toEqual({ denied: true, options: null });
});

test("buildEmergencyListOptions scopes non-admin listing to user", async () => {
  const { buildEmergencyListOptions } = await import(
    "../../src/modules/emergency/application/emergency.access-policy.js"
  );

  const result = buildEmergencyListOptions({
    query: { limit: 10, offset: 5, status: "QUEUED" },
    userId: "user-123",
    userRole: "USER",
  });

  expect(result).toEqual({
    denied: false,
    options: {
      limit: 10,
      offset: 5,
      status: "QUEUED",
      userId: "user-123",
    },
  });
});

test("buildEmergencyListOptions keeps admin query unscoped", async () => {
  const { buildEmergencyListOptions, canManageEmergencyRequestStatus } = await import(
    "../../src/modules/emergency/application/emergency.access-policy.js"
  );

  const result = buildEmergencyListOptions({
    query: { limit: 10, offset: 5 },
    userId: null,
    userRole: "ADMIN",
  });

  expect(result).toEqual({
    denied: false,
    options: { limit: 10, offset: 5 },
  });

  expect(canManageEmergencyRequestStatus("ADMIN")).toBe(true);
  expect(canManageEmergencyRequestStatus("USER")).toBe(false);
});
