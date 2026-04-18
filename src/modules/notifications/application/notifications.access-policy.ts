export function canSendAccidentNotification(userRole: string | undefined): boolean {
  return userRole === "ADMIN";
}
