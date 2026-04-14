/** @type {ReadonlyArray<"QUEUED" | "SENT" | "FAILED">} */
export const EMERGENCY_REQUEST_STATUSES = Object.freeze(["QUEUED", "SENT", "FAILED"]);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isEmergencyRequestStatus(value) {
  if (typeof value !== "string") return false;
  return EMERGENCY_REQUEST_STATUSES.includes(value);
}
