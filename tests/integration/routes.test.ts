const request = require("supertest");
const jwt = require("jsonwebtoken");

const ENV_KEYS = [
  "CENTRAL_UNIT_INBOUND_AUTH_MODE",
  "CENTRAL_UNIT_PROXY_VERIFIED_HEADER",
];

let envSnapshot = {};

beforeAll(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://user:pass@localhost:5432/db?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
});

beforeEach(() => {
  envSnapshot = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]])
  );
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (typeof envSnapshot[key] === "undefined") {
      delete process.env[key];
      continue;
    }
    process.env[key] = envSnapshot[key];
  }
});

test("POST /accident/report-accident returns 201 with accidentId", async () => {
  const { createApp } = await import("../../src/app.js");
  const app = createApp({
    authController: {
      register: (req, res) => res.status(501).json({ message: "test stub" }),
      login: (req, res) => res.status(501).json({ message: "test stub" }),
      refresh: (req, res) => res.status(501).json({ message: "test stub" }),
      logout: (req, res) => res.status(501).json({ message: "test stub" }),
      updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
      verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
      resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    },
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const res = await request(app).post("/accident/report-accident").send({
    location: { lat: 30.0444, lng: 31.2357 },
    message: "hello",
    occurredAt: "2026-01-29T12:34:56.000Z",
    media: [],
  });

  expect(res.status).toBe(201);
  expect(res.body.accidentId).toBe("test-id");
});

test("POST /accident/report-accident forwards authenticated reporter user id", async () => {
  const { createApp } = await import("../../src/app.js");

  const accidentsService = {
    reportAccident: jest.fn().mockResolvedValue({
      accidentId: "test-id",
      status: "received",
    }),
    createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
  };

  const app = createApp({
    authController: {
      register: (req, res) => res.status(501).json({ message: "test stub" }),
      login: (req, res) => res.status(501).json({ message: "test stub" }),
      refresh: (req, res) => res.status(501).json({ message: "test stub" }),
      logout: (req, res) => res.status(501).json({ message: "test stub" }),
      updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
      verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
      resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    },
    accidentsService,
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
    .post("/accident/report-accident")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      location: { lat: 30.0444, lng: 31.2357 },
      message: "hello",
      occurredAt: "2026-01-29T12:34:56.000Z",
      media: [],
    });

  expect(res.status).toBe(201);
  expect(accidentsService.reportAccident).toHaveBeenCalledWith(
    expect.objectContaining({
      reporterUserId: "user-123",
    })
  );
});

test("POST /accident/report-accident rejects invalid bearer token", async () => {
  const { createApp } = await import("../../src/app.js");

  const accidentsService = {
    reportAccident: jest.fn().mockResolvedValue({
      accidentId: "test-id",
      status: "received",
    }),
    createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
  };

  const app = createApp({
    authController: {
      register: (req, res) => res.status(501).json({ message: "test stub" }),
      login: (req, res) => res.status(501).json({ message: "test stub" }),
      refresh: (req, res) => res.status(501).json({ message: "test stub" }),
      logout: (req, res) => res.status(501).json({ message: "test stub" }),
      updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
      verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
      resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    },
    accidentsService,
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const res = await request(app)
    .post("/accident/report-accident")
    .set("Authorization", "Bearer invalid.token.value")
    .send({
      location: { lat: 30.0444, lng: 31.2357 },
      message: "hello",
      occurredAt: "2026-01-29T12:34:56.000Z",
      media: [],
    });

  expect(res.status).toBe(401);
  expect(accidentsService.reportAccident).not.toHaveBeenCalled();
});

test("POST /central-unit/receive-accident-from-central-unit requires auth by default", async () => {
  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "proxy";
  process.env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER = "x-client-cert-verified";
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db?schema=public";

  const { createApp } = await import("../../src/app.js");
  const app = createApp({
    authController: {
      register: (req, res) => res.status(501).json({ message: "test stub" }),
      login: (req, res) => res.status(501).json({ message: "test stub" }),
      refresh: (req, res) => res.status(501).json({ message: "test stub" }),
      logout: (req, res) => res.status(501).json({ message: "test stub" }),
      updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
      verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
      resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    },
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const res = await request(app).post("/central-unit/receive-accident-from-central-unit").send({
    centralUnitAccidentId: "cu-1",
    occurredAt: "2026-01-29T12:34:56.000Z",
    location: { lat: 30.0444, lng: 31.2357 },
  });

  expect(res.status).toBe(401);
});

test("POST /central-unit/send-accident-to-central-unit requires access token", async () => {
  const { createApp } = await import("../../src/app.js");

  const centralUnitService = {
    sendAccidentToCentralUnit: jest.fn().mockResolvedValue({ ok: true, centralUnitReferenceId: "ref" }),
    receiveAccidentFromCentralUnit: jest.fn().mockResolvedValue({ ok: true }),
  };

  const app = createApp({ centralUnitService });

  const res = await request(app)
    .post("/central-unit/send-accident-to-central-unit")
    .send({
      accidentId: "11111111-1111-4111-8111-111111111111",
      description: "major accident",
      latitude: 30.0444,
      longitude: 31.2357,
      severity: "high",
      media: [],
    });

  expect(res.status).toBe(401);
  expect(centralUnitService.sendAccidentToCentralUnit).not.toHaveBeenCalled();
});

test("POST /central-unit/send-accident-to-central-unit forbids non-admin user", async () => {
  const { createApp } = await import("../../src/app.js");

  const centralUnitService = {
    sendAccidentToCentralUnit: jest.fn().mockResolvedValue({ ok: true, centralUnitReferenceId: "ref" }),
    receiveAccidentFromCentralUnit: jest.fn().mockResolvedValue({ ok: true }),
  };

  const app = createApp({ centralUnitService });

  const token = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .post("/central-unit/send-accident-to-central-unit")
    .set("Authorization", `Bearer ${token}`)
    .send({
      accidentId: "11111111-1111-4111-8111-111111111111",
      description: "major accident",
      latitude: 30.0444,
      longitude: 31.2357,
      severity: "high",
      media: [],
    });

  expect(res.status).toBe(403);
  expect(res.body).toEqual({ success: false, message: "Forbidden" });
  expect(centralUnitService.sendAccidentToCentralUnit).not.toHaveBeenCalled();
});

test("POST /central-unit/send-accident-to-central-unit allows admin", async () => {
  const { createApp } = await import("../../src/app.js");

  const centralUnitService = {
    sendAccidentToCentralUnit: jest.fn().mockResolvedValue({ ok: true, centralUnitReferenceId: "ref" }),
    receiveAccidentFromCentralUnit: jest.fn().mockResolvedValue({ ok: true }),
  };

  const app = createApp({ centralUnitService });

  const token = jwt.sign(
    { sub: "admin-123", role: "ADMIN", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const payload = {
    accidentId: "11111111-1111-4111-8111-111111111111",
    description: "major accident",
    latitude: 30.0444,
    longitude: 31.2357,
    severity: "high",
    media: [],
  };

  const res = await request(app)
    .post("/central-unit/send-accident-to-central-unit")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, centralUnitReferenceId: "ref" });
  expect(centralUnitService.sendAccidentToCentralUnit).toHaveBeenCalledWith(payload);
});

test("POST /auth/register uses injected authService branch when authController is absent", async () => {
  const { createApp } = await import("../../src/app.js");

  const authService = {
    register: jest.fn().mockResolvedValue({
      user: { id: "user-1", email: "new@example.com", fullName: "New User" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    updateFcmToken: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  };

  const app = createApp({ authService });

  const res = await request(app).post("/auth/register").send({
    email: "new@example.com",
    password: "strongpassword123",
    fullName: "New User",
  });

  expect(res.status).toBe(201);
  expect(authService.register).toHaveBeenCalledWith({
    email: "new@example.com",
    password: "strongpassword123",
    fullName: "New User",
  });
});

test("default createApp wiring mounts central-unit route", async () => {
  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "proxy";
  process.env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER = "x-client-cert-verified";

  const { createApp } = await import("../../src/app.js");
  const app = createApp();

  const res = await request(app)
    .post("/central-unit/receive-accident-from-central-unit")
    .send({
      centralUnitAccidentId: "cu-1",
      occurredAt: "2026-01-29T12:34:56.000Z",
      location: { lat: 30.0444, lng: 31.2357 },
    });

  expect(res.status).toBe(401);
  expect(res.body.code).toBe("CENTRAL_UNIT_AUTH_FAILED");
});

test("GET /unknown echoes inbound X-Request-Id in response header and body", async () => {
  const { createApp } = await import("../../src/app.js");
  const app = createApp();

  const res = await request(app)
    .get("/unknown")
    .set("X-Request-Id", "req-custom-123");

  expect(res.status).toBe(404);
  expect(res.headers["x-request-id"]).toBe("req-custom-123");
  expect(res.body.requestId).toBe("req-custom-123");
});

test("GET /unknown generates request id when header is missing", async () => {
  const { createApp } = await import("../../src/app.js");
  const app = createApp();

  const res = await request(app).get("/unknown");

  expect(res.status).toBe(404);
  expect(typeof res.headers["x-request-id"]).toBe("string");
  expect(res.headers["x-request-id"]).not.toHaveLength(0);
  expect(res.body.requestId).toBe(res.headers["x-request-id"]);
});

test("POST /central-unit/receive-accident-from-central-unit accepts trusted proxy header", async () => {
  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "proxy";
  process.env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER = "x-client-cert-verified";

  const { createApp } = await import("../../src/app.js");
  const app = createApp({
    authController: {
      register: (req, res) => res.status(501).json({ message: "test stub" }),
      login: (req, res) => res.status(501).json({ message: "test stub" }),
      refresh: (req, res) => res.status(501).json({ message: "test stub" }),
      logout: (req, res) => res.status(501).json({ message: "test stub" }),
      updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
      verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
      resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    },
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const res = await request(app)
    .post("/central-unit/receive-accident-from-central-unit")
    .set("x-client-cert-verified", "true")
    .send({
      centralUnitAccidentId: "cu-1",
      occurredAt: "2026-01-29T12:34:56.000Z",
      location: { lat: 30.0444, lng: 31.2357 },
    });

  expect(res.status).toBe(202);
  expect(res.body).toEqual({ ok: true });
});

test("POST /central-unit/receive-accident-from-central-unit bypasses auth when mode is off", async () => {
  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "off";

  const { createApp } = await import("../../src/app.js");
  const app = createApp({
    authController: {
      register: (req, res) => res.status(501).json({ message: "test stub" }),
      login: (req, res) => res.status(501).json({ message: "test stub" }),
      refresh: (req, res) => res.status(501).json({ message: "test stub" }),
      logout: (req, res) => res.status(501).json({ message: "test stub" }),
      updateFcmToken: (req, res) => res.status(501).json({ message: "test stub" }),
      verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
      resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    },
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
  });

  const res = await request(app)
    .post("/central-unit/receive-accident-from-central-unit")
    .send({
      centralUnitAccidentId: "cu-1",
      occurredAt: "2026-01-29T12:34:56.000Z",
      location: { lat: 30.0444, lng: 31.2357 },
    });

  expect(res.status).toBe(202);
  expect(res.body).toEqual({ ok: true });
});

test("POST /auth/update-fcm-token requires access token", async () => {
  const { createApp } = await import("../../src/app.js");

  const authController = {
    register: (req, res) => res.status(501).json({ message: "test stub" }),
    login: (req, res) => res.status(501).json({ message: "test stub" }),
    refresh: (req, res) => res.status(501).json({ message: "test stub" }),
    logout: (req, res) => res.status(501).json({ message: "test stub" }),
    updateFcmToken: jest.fn((req, res) => res.status(200).json({ ok: true })),
    verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
  };

  const app = createApp({ authController });

  const res = await request(app).post("/auth/update-fcm-token").send({
    sessionId: "session-1",
    fcmToken: "token-1",
  });

  expect(res.status).toBe(401);
  expect(authController.updateFcmToken).not.toHaveBeenCalled();
});

test("POST /auth/update-fcm-token allows authenticated request", async () => {
  const { createApp } = await import("../../src/app.js");

  const authController = {
    register: (req, res) => res.status(501).json({ message: "test stub" }),
    login: (req, res) => res.status(501).json({ message: "test stub" }),
    refresh: (req, res) => res.status(501).json({ message: "test stub" }),
    logout: (req, res) => res.status(501).json({ message: "test stub" }),
    updateFcmToken: jest.fn((req, res) =>
      res.status(200).json({ ok: true, userId: req.userId })
    ),
    verifyEmail: (req, res) => res.status(501).json({ message: "test stub" }),
    resendVerificationEmail: (req, res) => res.status(501).json({ message: "test stub" }),
  };

  const app = createApp({ authController });

  const token = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .post("/auth/update-fcm-token")
    .set("Authorization", `Bearer ${token}`)
    .send({
      sessionId: "session-1",
      fcmToken: "token-1",
    });

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true, userId: "user-123" });
  expect(authController.updateFcmToken).toHaveBeenCalledTimes(1);
});

