const request = require("supertest");
const jwt = require("jsonwebtoken");

beforeAll(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://user:pass@localhost:5432/db?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
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

