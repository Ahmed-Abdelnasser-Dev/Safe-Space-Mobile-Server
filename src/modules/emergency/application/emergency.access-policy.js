/** @typedef {import("../../../types/index").UserRole} UserRole */
/** @typedef {import("../../../types/index").EmergencyRequestStatus} EmergencyRequestStatus */

/**
 * @typedef {{
 *   status?: EmergencyRequestStatus,
 *   limit?: number,
 *   offset?: number
 * }} EmergencyListQuery
 */

/**
 * @typedef {{ denied: true, options: null } | { denied: false, options: EmergencyListQuery & { userId?: string } }} EmergencyListPolicy
 */

/**
 * @param {UserRole | undefined} userRole
 * @returns {boolean}
 */
export function canManageEmergencyRequestStatus(userRole) {
  return userRole === "ADMIN";
}

/**
 * @param {{ query?: EmergencyListQuery, userId?: string | null, userRole?: UserRole }} input
 * @returns {EmergencyListPolicy}
 */
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
