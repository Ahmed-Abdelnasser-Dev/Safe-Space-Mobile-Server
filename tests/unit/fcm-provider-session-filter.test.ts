jest.mock("firebase-admin", () => {
  const send = jest.fn().mockResolvedValue("message-id");

  return {
    __esModule: true,
    default: {
      apps: [{}],
      app: jest.fn(() => ({})),
      messaging: jest.fn(() => ({ send })),
      credential: {
        cert: jest.fn(),
      },
      initializeApp: jest.fn(),
    },
  };
});

test("FCM provider queries non-revoked sessions with token without requiring session expiry", async () => {
  const findMany = jest.fn().mockResolvedValue([
    { id: "session-1", fcmToken: "token-1", deviceId: "device-1" },
  ]);
  const update = jest.fn().mockResolvedValue({});

  const prisma = {
    session: {
      findMany,
      update,
    },
  };

  const { createFcmProvider } = await import(
    "../../src/modules/notifications/fcm.provider.js"
  );

  const provider = createFcmProvider(prisma as any);

  const result = await provider.sendToUsers({
    userIds: ["user-1"],
    title: "Accident Nearby",
    body: "An accident was reported nearby.",
    data: { type: "ACCIDENT" },
  });

  expect(result.sent).toBe(1);
  expect(result.failed).toBe(0);
  expect(findMany).toHaveBeenCalledTimes(1);

  const call = findMany.mock.calls[0][0];
  expect(call.where).toEqual(
    expect.objectContaining({
      userId: "user-1",
      revokedAt: null,
      fcmToken: { not: null },
    })
  );
  expect(call.where).not.toHaveProperty("expiresAt");
});
