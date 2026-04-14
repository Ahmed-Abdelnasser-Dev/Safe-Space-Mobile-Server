export function buildAccidentNotificationPayload({ accidentId, streetName, data }) {
  const safeData = { ...(data || {}) };

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
