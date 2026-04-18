jest.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("notification result logging", () => {
  const ENV_KEYS = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;
  let envSnapshot: Record<string, string | undefined> = {};

  beforeAll(() => {
    envSnapshot = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]])
    );

    process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/db?schema=public";
    process.env.JWT_ACCESS_SECRET ||= "test-access-secret";
    process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret";
  });

  afterEach(async () => {
    const { logger } = await import("../../src/utils/logger.js");
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
    logger.debug.mockClear();
  });

  afterAll(() => {
    for (const key of ENV_KEYS) {
      if (typeof envSnapshot[key] === "undefined") {
        delete process.env[key];
      } else {
        process.env[key] = envSnapshot[key];
      }
    }
  });

  test("central unit flow warns when provider reports all notification sends failed", async () => {
    const { createCentralUnitService } = await import(
      "../../src/modules/centralUnit/centralUnit.service.js"
    );
    const { logger } = await import("../../src/utils/logger.js");

    const centralUnitRepo = {
      findAccidentById: jest.fn(),
      markAccidentSentToCentralUnit: jest.fn(),
      createInboundCentralUnitAccident: jest.fn().mockResolvedValue({ id: "acc-cu-1" }),
      getActiveUsersWithFcmTokens: jest.fn().mockResolvedValue(["u-1", "u-2"]),
    };

    const notificationsService = {
      sendAccidentNotification: jest.fn().mockResolvedValue({
        ok: true,
        sent: 0,
        failed: 2,
      }),
    };

    const service = createCentralUnitService({
      centralUnitRepo,
      notificationsService,
    });

    await service.receiveAccidentFromCentralUnit({
      centralUnitAccidentId: "cu-123",
      occurredAt: "2026-01-01T00:00:00.000Z",
      location: { lat: 30.01, lng: 31.01 },
    });

    expect(notificationsService.sendAccidentNotification).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        accidentId: "acc-cu-1",
        userCount: 2,
        sent: 0,
        failed: 2,
      }),
      "Accident notification failed for all users"
    );

    const successLogs = logger.info.mock.calls.filter(
      (call: unknown[]) => call[1] === "Accident notification sent to users"
    );
    expect(successLogs).toHaveLength(0);
  });

  test("mobile accident flow warns when provider reports all notification sends failed", async () => {
    const { createAccidentsService } = await import(
      "../../src/modules/accidents/accidents.service.js"
    );
    const { logger } = await import("../../src/utils/logger.js");

    const accidentsRepo = {
      createAccident: jest.fn().mockResolvedValue({ id: "acc-mobile-1" }),
      getActiveUsersWithFcmTokens: jest.fn().mockResolvedValue(["u-1"]),
    };

    const notificationsService = {
      sendAccidentNotification: jest.fn().mockResolvedValue({
        ok: true,
        sent: 0,
        failed: 1,
      }),
    };

    const service = createAccidentsService({
      accidentsRepo,
      notificationsService,
    });

    await service.reportAccident({
      reporterUserId: "owner-1",
      location: { lat: 30.02, lng: 31.02 },
      message: "accident",
      occurredAt: "2026-01-01T00:00:00.000Z",
      media: [],
    });

    expect(notificationsService.sendAccidentNotification).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        accidentId: "acc-mobile-1",
        userCount: 1,
        sent: 0,
        failed: 1,
      }),
      "Accident notification failed for all users"
    );

    const successLogs = logger.info.mock.calls.filter(
      (call: unknown[]) => call[1] === "Accident notification sent to users"
    );
    expect(successLogs).toHaveLength(0);
  });
});
