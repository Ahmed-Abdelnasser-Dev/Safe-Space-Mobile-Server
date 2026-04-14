export function canSendAccidentNotification(userRole) {
  return userRole === "ADMIN";
}
