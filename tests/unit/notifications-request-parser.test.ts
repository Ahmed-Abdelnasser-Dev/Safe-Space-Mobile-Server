test("parseSendAccidentNotificationRequest deduplicates userIds", async () => {
  const { parseSendAccidentNotificationRequest } = await import(
    "../../src/modules/notifications/application/notifications.request-parser.js"
  );

  const parsed = parseSendAccidentNotificationRequest({
    accidentId: "4d44b6ad-db1c-4fd0-aef5-51b3fd5264a2",
    userIds: [
      "11111111-1111-1111-1111-111111111111",
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ],
    title: "Accident Alert",
    body: "Drive carefully",
  });

  expect(parsed.userIds).toEqual([
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
  ]);
});
