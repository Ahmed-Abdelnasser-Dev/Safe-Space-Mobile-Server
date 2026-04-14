test("canSendAccidentNotification allows only admins", async () => {
  const { canSendAccidentNotification } = await import(
    "../../src/modules/notifications/application/notifications.access-policy.js"
  );

  expect(canSendAccidentNotification("ADMIN")).toBe(true);
  expect(canSendAccidentNotification("USER")).toBe(false);
  expect(canSendAccidentNotification(undefined)).toBe(false);
});
