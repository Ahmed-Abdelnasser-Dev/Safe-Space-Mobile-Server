const request = require("supertest");
const jwt = require("jsonwebtoken");

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

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

test("GET /emergency/requests returns empty list for unauthenticated callers", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn(),
    listEmergencyRequests: jest.fn().mockResolvedValue({
      data: [{ id: "hidden-request" }],
      total: 1,
      limit: 20,
      offset: 0,
    }),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const res = await request(app).get("/emergency/requests");

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data).toEqual([]);
  expect(res.body.meta).toEqual({ total: 0, limit: 20, offset: 0 });
  expect(emergencyService.listEmergencyRequests).not.toHaveBeenCalled();
});

test("POST /emergency/request accepts valid payload and calls service", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn().mockResolvedValue({ id: "req-1", status: "QUEUED" }),
    getEmergencyRequest: jest.fn(),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const res = await request(app).post("/emergency/request").send({
    emergencyTypes: ["FIRE"],
    emergencyServices: ["FIRE_DEPARTMENT"],
    description: "Building fire",
    location: { lat: 30.0444, lng: 31.2357 },
    timestamp: "2026-01-29T12:34:56.000Z",
  });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(emergencyService.createEmergencyRequest).toHaveBeenCalledWith(
    expect.objectContaining({
      emergencyTypes: ["FIRE"],
      emergencyServices: ["FIRE_DEPARTMENT"],
      description: "Building fire",
      photoUri: null,
    })
  );
});

test("GET /emergency/requests scopes listing for authenticated non-admin caller", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn(),
    listEmergencyRequests: jest.fn().mockResolvedValue({
      data: [{ id: "owned-request" }],
      total: 1,
      limit: 20,
      offset: 0,
    }),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const token = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .get("/emergency/requests")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.data).toEqual([{ id: "owned-request" }]);
  expect(emergencyService.listEmergencyRequests).toHaveBeenCalledWith({
    limit: 20,
    offset: 0,
    userId: "user-123",
  });
});

test("PATCH /emergency/request/:id/status allows admin role", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn(),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn().mockResolvedValue({
      id: "d5bff34d-8f21-40fd-9d2f-b3379fba1cb2",
      status: "SENT",
    }),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const token = jwt.sign(
    { sub: "admin-123", role: "ADMIN", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .patch("/emergency/request/d5bff34d-8f21-40fd-9d2f-b3379fba1cb2/status")
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "SENT" });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(emergencyService.updateEmergencyRequestStatus).toHaveBeenCalledWith(
    "d5bff34d-8f21-40fd-9d2f-b3379fba1cb2",
    "SENT"
  );
});

test("PATCH /emergency/request/:id/status rejects non-admin role", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn(),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const token = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .patch("/emergency/request/d5bff34d-8f21-40fd-9d2f-b3379fba1cb2/status")
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "SENT" });

  expect(res.status).toBe(403);
  expect(res.body.success).toBe(false);
  expect(emergencyService.updateEmergencyRequestStatus).not.toHaveBeenCalled();
});

test("GET /emergency/request/:id forbids unauthenticated access", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn().mockResolvedValue({
      id: REQUEST_ID,
      requesterUserId: "user-123",
    }),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const res = await request(app).get(`/emergency/request/${REQUEST_ID}`);

  expect(res.status).toBe(403);
  expect(res.body).toEqual({ success: false, message: "Forbidden" });
});

test("GET /emergency/request/:id allows owner", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn().mockResolvedValue({
      id: REQUEST_ID,
      requesterUserId: "user-123",
    }),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const token = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .get(`/emergency/request/${REQUEST_ID}`)
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});

test("GET /emergency/request/:id returns not found for non-owner", async () => {
  const { createApp } = await import("../../src/app.js");

  const emergencyService = {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn().mockResolvedValue({
      id: REQUEST_ID,
      requesterUserId: "owner-1",
    }),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const app = createApp({
    authController: buildAuthControllerStub(),
    accidentsService: {
      reportAccident: async () => ({ accidentId: "test-id", status: "received" }),
      createEmergencyRequest: async () => ({ requestId: "x", status: "queued" }),
    },
    centralUnitService: {
      sendAccidentToCentralUnit: async () => ({ ok: true, centralUnitReferenceId: "ref" }),
      receiveAccidentFromCentralUnit: async () => ({ ok: true }),
    },
    emergencyService,
  });

  const token = jwt.sign(
    { sub: "user-123", role: "USER", tokenUse: "access" },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: "HS256", expiresIn: "5m" }
  );

  const res = await request(app)
    .get(`/emergency/request/${REQUEST_ID}`)
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(404);
  expect(res.body).toEqual({ success: false, message: "Emergency request not found" });
});
