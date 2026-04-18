import type { EmergencyRequestStatus } from "../../../types/index.js";

export const EMERGENCY_REQUEST_STATUSES: ReadonlyArray<EmergencyRequestStatus> =
  Object.freeze(["QUEUED", "SENT", "FAILED"]);

export function isEmergencyRequestStatus(
  value: unknown,
): value is EmergencyRequestStatus {
  if (typeof value !== "string") return false;
  return EMERGENCY_REQUEST_STATUSES.includes(value as EmergencyRequestStatus);
}
