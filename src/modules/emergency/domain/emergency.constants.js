export const EMERGENCY_REQUEST_STATUSES = ["QUEUED", "SENT", "FAILED"];

export function isEmergencyRequestStatus(value) {
  return EMERGENCY_REQUEST_STATUSES.includes(value);
}
