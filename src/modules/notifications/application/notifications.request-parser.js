export function parseSendAccidentNotificationRequest(body) {
  return {
    ...body,
    userIds: Array.from(new Set(body.userIds)),
  };
}
