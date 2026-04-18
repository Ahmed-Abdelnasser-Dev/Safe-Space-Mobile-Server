function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createEmergencyServiceStub(record) {
  return {
    createEmergencyRequest: jest.fn(),
    getEmergencyRequest: jest.fn().mockResolvedValue(record),
    listEmergencyRequests: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };
}

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

test("getEmergencyRequestHandler forbids unauthenticated non-admin access", async () => {
  const { createEmergencyController } = await import(
    "../../src/modules/emergency/emergency.controller.js"
  );

  const emergencyService = createEmergencyServiceStub({
    id: REQUEST_ID,
    requesterUserId: "user-1",
  });

  const controller = createEmergencyController({ emergencyService });
  const req = { params: { id: REQUEST_ID }, userId: undefined, userRole: undefined };
  const res = createRes();
  const next = jest.fn();

  await controller.getEmergencyRequestHandler(req, res, next);

  expect(res.statusCode).toBe(403);
  expect(res.body).toEqual({ success: false, message: "Forbidden" });
  expect(emergencyService.getEmergencyRequest).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
});

test("getEmergencyRequestHandler forbids access to non-owner user", async () => {
  const { createEmergencyController } = await import(
    "../../src/modules/emergency/emergency.controller.js"
  );

  const emergencyService = createEmergencyServiceStub({
    id: REQUEST_ID,
    requesterUserId: "owner-1",
  });

  const controller = createEmergencyController({ emergencyService });
  const req = { params: { id: REQUEST_ID }, userId: "user-2", userRole: "USER" };
  const res = createRes();
  const next = jest.fn();

  await controller.getEmergencyRequestHandler(req, res, next);

  expect(res.statusCode).toBe(404);
  expect(res.body).toEqual({ success: false, message: "Emergency request not found" });
  expect(next).not.toHaveBeenCalled();
});

test("getEmergencyRequestHandler allows owner", async () => {
  const { createEmergencyController } = await import(
    "../../src/modules/emergency/emergency.controller.js"
  );

  const record = {
    id: REQUEST_ID,
    requesterUserId: "user-1",
    description: "help",
  };
  const emergencyService = createEmergencyServiceStub(record);

  const controller = createEmergencyController({ emergencyService });
  const req = { params: { id: REQUEST_ID }, userId: "user-1", userRole: "USER" };
  const res = createRes();
  const next = jest.fn();

  await controller.getEmergencyRequestHandler(req, res, next);

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ success: true, data: record });
  expect(next).not.toHaveBeenCalled();
});

test("getEmergencyRequestHandler allows admin", async () => {
  const { createEmergencyController } = await import(
    "../../src/modules/emergency/emergency.controller.js"
  );

  const record = {
    id: REQUEST_ID,
    requesterUserId: "user-1",
    description: "help",
  };
  const emergencyService = createEmergencyServiceStub(record);

  const controller = createEmergencyController({ emergencyService });
  const req = { params: { id: REQUEST_ID }, userId: "admin-1", userRole: "ADMIN" };
  const res = createRes();
  const next = jest.fn();

  await controller.getEmergencyRequestHandler(req, res, next);

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ success: true, data: record });
  expect(next).not.toHaveBeenCalled();
});
