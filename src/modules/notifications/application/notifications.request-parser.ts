import type { NotificationDataValue } from "../../../types/index.js";

type SendAccidentNotificationRequest = {
  accidentId: string;
  userIds: string[];
  title: string;
  body: string;
  streetName?: string;
  data?: Record<string, NotificationDataValue>;
};

export function parseSendAccidentNotificationRequest(
  body: SendAccidentNotificationRequest
): SendAccidentNotificationRequest {
  return {
    ...body,
    userIds: Array.from(new Set(body.userIds)),
  };
}
