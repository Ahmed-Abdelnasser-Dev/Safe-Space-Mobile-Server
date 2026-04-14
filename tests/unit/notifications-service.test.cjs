test("sendAccidentNotification keeps reserved payload keys canonical", async () => {
  const { createNotificationsService } = await import(
    "../../src/modules/notifications/notifications.service.js"
  );

  const provider = {
    sendToUsers: jest.fn().mockResolvedValue({
      sent: 1,
      failed: 0,
      failures: [],
    }),
  };

  const prisma = {
    notificationLog: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  const service = createNotificationsService({ prisma, provider });

  const result = await service.sendAccidentNotification({
    accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
    userIds: ["11111111-1111-1111-1111-111111111111"],
    title: "Accident Alert",
    body: "Drive carefully",
    streetName: "Main St",
    data: {
      type: "OVERRIDE",
      accidentId: "override",
      streetName: "override",
      severity: "high",
    },
  });

  expect(provider.sendToUsers).toHaveBeenCalledWith(
    expect.objectContaining({
      data: {
        severity: "high",
        streetName: "Main St",
        type: "ACCIDENT",
        accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
      },
    })
  );
  expect(result).toEqual({ ok: true, sent: 1, failed: 0 });
});
