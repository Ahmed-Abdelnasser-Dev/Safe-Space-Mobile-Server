test("buildAccidentNotificationPayload protects reserved keys", async () => {
  const { buildAccidentNotificationPayload } = await import(
    "../../src/modules/notifications/application/notifications.payload.js"
  );

  const payload = buildAccidentNotificationPayload({
    accidentId: "a3c86f86-8de2-4df7-9012-58d7e2a41ca8",
    streetName: "Main St",
    data: {
      type: "OVERRIDE",
      accidentId: "override",
      streetName: "override",
      severity: "high",
    },
  });

  expect(payload).toEqual({
    severity: "high",
    streetName: "Main St",
    type: "ACCIDENT",
    accidentId: "a3c86f86-8de2-4df7-9012-58d7e2a41ca8",
  });
});
