const request = require("supertest");
const jwt = require("jsonwebtoken");

beforeAll(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://user:pass@localhost:5432/db?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
});

function buildAuthControllerStub() {
  return {
    register: (req, res) => res.status(501).json({ message: "test stub" }),
    login: (req, res) => res.status(501).json({ message: "test stub" }),
    refresh: (req, res) => res.status(501).json({ message: "test stub" }),
    logout: (req, res) => res.status(501).json({ message: "test stub" }),
    updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
    verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
  };
}

test("POST /notifications/send-accident-notification requires auth", async () => {
  const { createApp } = await import("../../src/app.js");

  const notificationsService = {
    sendAccidentNotification: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    notificationsService,
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const res = await request(app).post("/notifications/send-accident-notification").send({
    accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
    userIds: ["11111111-1111-4111-8111-111111111111"],
    title: "Accident Alert",
    body: "Drive carefully",
  });

  expect(res.status).toBe(401);
  expect(notificationsService.sendAccidentNotification).not.toHaveBeenCalled();
});

test("POST /notifications/send-accident-notification rejects non-admin", async () => {
  const { createApp } = await import("../../src/app.js");

  const notificationsService = {
    sendAccidentNotification: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    notificationsService,
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const accessToken = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .post("/notifications/send-accident-notification")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
      userIds: ["11111111-1111-4111-8111-111111111111"],
      title: "Accident Alert",
      body: "Drive carefully",
    });

  expect(res.status).toBe(403);
  expect(notificationsService.sendAccidentNotification).not.toHaveBeenCalled();
});

test("POST /notifications/send-accident-notification allows admin and deduplicates users", async () => {
  const { createApp } = await import("../../src/app.js");

  const notificationsService = {
    sendAccidentNotification: jest.fn().mockResolvedValue({
      ok: true,
      sent: 2,
      failed: 0,
    }),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    notificationsService,
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const accessToken = jwt.sign(
    { sub: "admin-123", role: "ADMIN", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .post("/notifications/send-accident-notification")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
      userIds: [
        "11111111-1111-4111-8111-111111111111",
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      title: "Accident Alert",
      body: "Drive carefully",
      data: {
        severity: "high",
      },
    });

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, sent: 2, failed: 0 });
  expect(notificationsService.sendAccidentNotification).toHaveBeenCalledWith(
    expect.objectContaining({
      userIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
    })
  );
});

test("POST /notifications/send-accident-notification rejects oversized raw userIds input", async () => {
  const { createApp } = await import("../../src/app.js");

  const notificationsService = {
    sendAccidentNotification: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    notificationsService,
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const accessToken = jwt.sign(
    { sub: "admin-123", role: "ADMIN", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const duplicatedIds = Array.from({ length: 501 }, () =>
    "11111111-1111-4111-8111-111111111111"
  );

  const res = await request(app)
    .post("/notifications/send-accident-notification")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
      userIds: duplicatedIds,
      title: "Accident Alert",
      body: "Drive carefully",
    });

  expect(res.status).toBe(400);
  expect(notificationsService.sendAccidentNotification).not.toHaveBeenCalled();
});
