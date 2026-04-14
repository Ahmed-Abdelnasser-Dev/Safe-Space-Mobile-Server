/**
 * @param {{
 *   accidentId: string,
 *   userIds: string[],
 *   title: string,
 *   body: string,
 *   streetName?: string,
 *   data?: Record<string, import("../../../types/index").NotificationDataValue>
 * }} body
 */
export function parseSendAccidentNotificationRequest(body) {
  return {
    ...body,
    userIds: Array.from(new Set(body.userIds)),
  };
}
