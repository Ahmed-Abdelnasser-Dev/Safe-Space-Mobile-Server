/**
 * @param {string | undefined} userRole
 * @returns {boolean}
 */
export function canSendAccidentNotification(userRole) {
  return userRole === "ADMIN";
}
