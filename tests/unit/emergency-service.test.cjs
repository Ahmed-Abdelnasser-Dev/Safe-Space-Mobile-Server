test("listEmergencyRequests passes user/status filters into count metadata", async () => {
  const { createEmergencyService } = await import(
    "../../src/modules/emergency/emergency.service.js"
  );

  const emergencyRepo = {
    listEmergencyRequests: jest.fn().mockResolvedValue([{ id: "req-1" }]),
    countEmergencyRequests: jest.fn().mockResolvedValue(1),
    createEmergencyRequest: jest.fn(),
    findEmergencyRequestById: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const service = createEmergencyService({ emergencyRepo });

  const result = await service.listEmergencyRequests({
    status: "QUEUED",
    userId: "user-123",
    limit: 5,
    offset: 2,
  });

  expect(emergencyRepo.listEmergencyRequests).toHaveBeenCalledWith({
    status: "QUEUED",
    userId: "user-123",
    limit: 5,
    offset: 2,
  });
  expect(emergencyRepo.countEmergencyRequests).toHaveBeenCalledWith({
    status: "QUEUED",
    requesterUserId: "user-123",
  });
  expect(result).toEqual({
    data: [{ id: "req-1" }],
    total: 1,
    limit: 5,
    offset: 2,
  });
});

test("updateEmergencyRequestStatus rejects unsupported status", async () => {
  const { createEmergencyService } = await import(
    "../../src/modules/emergency/emergency.service.js"
  );

  const emergencyRepo = {
    listEmergencyRequests: jest.fn(),
    countEmergencyRequests: jest.fn(),
    createEmergencyRequest: jest.fn(),
    findEmergencyRequestById: jest.fn(),
    updateEmergencyRequestStatus: jest.fn(),
  };

  const service = createEmergencyService({ emergencyRepo });

  await expect(service.updateEmergencyRequestStatus("req-1", "DONE")).rejects.toMatchObject({
    statusCode: 400,
    expose: true,
  });
  expect(emergencyRepo.updateEmergencyRequestStatus).not.toHaveBeenCalled();
});
