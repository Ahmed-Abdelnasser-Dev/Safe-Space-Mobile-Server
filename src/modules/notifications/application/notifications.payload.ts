import type { NotificationDataValue } from "../../../types/index.js";

export function buildAccidentNotificationPayload({
  accidentId,
  streetName,
  data,
}: {
  accidentId: string;
  streetName?: string;
  data?: Record<string, NotificationDataValue>;
}): Record<string, NotificationDataValue | string> {
  const safeData: Record<string, NotificationDataValue> = { ...(data || {}) };

  delete safeData.type;
  delete safeData.accidentId;
  delete safeData.streetName;

  return {
    ...safeData,
    ...(streetName ? { streetName } : {}),
    type: "ACCIDENT",
    accidentId,
  };
}
