export function canManageEmergencyRequestStatus(userRole) {
  return userRole === "ADMIN";
}

export function buildEmergencyListOptions({ query, userId, userRole }) {
  const isAdmin = userRole === "ADMIN";

  if (isAdmin) {
    return { denied: false, options: { ...query } };
  }

  if (!userId) {
    return { denied: true, options: null };
  }

  return {
    denied: false,
    options: {
      ...query,
      userId,
    },
  };
}
