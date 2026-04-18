import type { EmergencyRequestStatus, UserRole } from "../../../types/index.js";

type EmergencyListQuery = {
  status?: EmergencyRequestStatus;
  limit?: number;
  offset?: number;
};

type EmergencyListPolicy =
  | { denied: true; options: null }
  | { denied: false; options: EmergencyListQuery & { userId?: string } };

export function canManageEmergencyRequestStatus(
  userRole: UserRole | undefined,
): boolean {
  return userRole === "ADMIN";
}

export function buildEmergencyListOptions({
  query,
  userId,
  userRole,
}: {
  query?: EmergencyListQuery;
  userId?: string | null;
  userRole?: UserRole;
}): EmergencyListPolicy {
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
