test("central unit repo includes non-revoked token sessions even if auth session expired", async () => {
  const findMany = jest.fn().mockResolvedValue([{ userId: "user-1" }]);

  const prisma = {
    accident: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    session: {
      findMany,
    },
  };

  const { createCentralUnitRepo } = await import(
    "../../src/modules/centralUnit/centralUnit.repo.js"
  );

  const repo = createCentralUnitRepo(prisma as any);
  await repo.getActiveUsersWithFcmTokens();

  expect(findMany).toHaveBeenCalledTimes(1);

  const call = findMany.mock.calls[0][0];
  expect(call.where).toEqual(
    expect.objectContaining({
      fcmToken: { not: null },
      revokedAt: null,
    })
  );
  expect(call.where).not.toHaveProperty("expiresAt");
});

test("accidents repo excludes reporter without requiring session expiry filter", async () => {
  const findMany = jest.fn().mockResolvedValue([
    { userId: "user-2" },
    { userId: "user-3" },
  ]);

  const prisma = {
    accident: {
      create: jest.fn().mockResolvedValue({ id: "acc-1" }),
    },
    session: {
      findMany,
    },
  };

  const { createAccidentsRepo } = await import(
    "../../src/modules/accidents/accidents.repo.js"
  );

  const repo = createAccidentsRepo(prisma as any);
  const users = await repo.getActiveUsersWithFcmTokens("user-1");

  expect(users).toEqual(["user-2", "user-3"]);
  expect(findMany).toHaveBeenCalledTimes(1);

  const call = findMany.mock.calls[0][0];
  expect(call.where).toEqual(
    expect.objectContaining({
      fcmToken: { not: null },
      revokedAt: null,
      userId: { not: "user-1" },
    })
  );
  expect(call.where).not.toHaveProperty("expiresAt");
});
