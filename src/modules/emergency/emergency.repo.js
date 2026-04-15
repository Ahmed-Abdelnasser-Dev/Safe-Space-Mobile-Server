/**
 * @typedef {{
 *   id: string,
 *   emergencyTypes: string[],
 *   emergencyServices: string[],
 *   description: string,
 *   photoUri: string | null,
 *   lat: number,
 *   lng: number,
 *   timestamp: Date,
 *   status: string,
 *   createdAt: Date
 * }} EmergencyRequestSummary
 */

/**
 * @typedef {{
 *   id: string,
 *   requesterUserId: string | null,
 *   emergencyTypes: string[],
 *   emergencyServices: string[],
 *   description: string,
 *   photoUri: string | null,
 *   lat: number,
 *   lng: number,
 *   timestamp: Date,
 *   status: string,
 *   createdAt: Date,
 *   updatedAt: Date,
 *   requester: {
 *     id: string,
 *     fullName: string | null,
 *     email: string,
 *     phoneNumber: string | null,
 *     bloodType: string | null,
 *     allergies: string[] | null,
 *     chronicConditions: string[] | null,
 *     emergencyContactName: string | null,
 *     emergencyContactPhone: string | null
 *   } | null
 * }} EmergencyRequestDetails
 */

/**
 * @typedef {{
 *   requesterUserId: string | null,
 *   emergencyTypes: string[],
 *   emergencyServices: string[],
 *   description: string,
 *   photoUri: string | null,
 *   lat: number,
 *   lng: number,
 *   timestamp: Date,
 *   status?: string
 * }} EmergencyRequestCreateInput
 */

/**
 * @typedef {{
 *   status?: string,
 *   limit?: number,
 *   offset?: number,
 *   userId?: string
 * }} EmergencyListOptions
 */

/**
 * @typedef {{
 *   emergencyRequest: {
 *     create: (input: { data: unknown, select: unknown }) => Promise<EmergencyRequestSummary>,
 *     findUnique: (input: { where: { id: string }, select: unknown }) => Promise<EmergencyRequestDetails | null>,
 *     findMany: (input: { where: Record<string, unknown>, select: unknown, orderBy: { timestamp: "desc" }, take: number, skip: number }) => Promise<EmergencyRequestSummary[]>,
 *     update: (input: { where: { id: string }, data: { status: string }, select: unknown }) => Promise<{ id: string, status: string, updatedAt: Date }>,
 *     count: (input: { where: Record<string, unknown> }) => Promise<number>
 *   }
 * }} EmergencyPrismaLike
 */

/**
 * Emergency Repository
 * Handles all database operations for emergency requests
 * 
 * @param {EmergencyPrismaLike} prisma - Prisma client instance
 */
export function createEmergencyRepo(prisma) {
  return {
    /**
     * Create a new emergency request
     * 
    * @param {EmergencyRequestCreateInput} data - Emergency request data
    * @returns {Promise<EmergencyRequestSummary>} Created emergency request with ID
     */
    async createEmergencyRequest(data) {
      return prisma.emergencyRequest.create({
        data: {
          requesterUserId: data.requesterUserId,
          emergencyTypes: data.emergencyTypes,
          emergencyServices: data.emergencyServices,
          description: data.description,
          photoUri: data.photoUri || null,
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp,
          status: data.status || "QUEUED",
        },
        select: {
          id: true,
          emergencyTypes: true,
          emergencyServices: true,
          description: true,
          photoUri: true,
          lat: true,
          lng: true,
          timestamp: true,
          status: true,
          createdAt: true,
        },
      });
    },

    /**
     * Find emergency request by ID
     * 
     * @param {string} id - Emergency request ID
    * @returns {Promise<EmergencyRequestDetails | null>} Emergency request or null if not found
     */
    async findEmergencyRequestById(id) {
      return prisma.emergencyRequest.findUnique({
        where: { id },
        select: {
          id: true,
          requesterUserId: true,
          emergencyTypes: true,
          emergencyServices: true,
          description: true,
          photoUri: true,
          lat: true,
          lng: true,
          timestamp: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          requester: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              bloodType: true,
              allergies: true,
              chronicConditions: true,
              emergencyContactName: true,
              emergencyContactPhone: true,
            },
          },
        },
      });
    },

    /**
     * List emergency requests with optional filtering
     * 
    * @param {EmergencyListOptions} [options] - Query options
    * @returns {Promise<EmergencyRequestSummary[]>} List of emergency requests
     */
    async listEmergencyRequests(options = {}) {
      const { status, limit = 20, offset = 0, userId } = options;

      const where = {};
      if (status) where.status = status;
      if (userId) where.requesterUserId = userId;

      return prisma.emergencyRequest.findMany({
        where,
        select: {
          id: true,
          requesterUserId: true,
          emergencyTypes: true,
          emergencyServices: true,
          description: true,
          photoUri: true,
          lat: true,
          lng: true,
          timestamp: true,
          status: true,
          createdAt: true,
          requester: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      });
    },

    /**
     * Update emergency request status
     * 
     * @param {string} id - Emergency request ID
     * @param {string} status - New status (QUEUED, SENT, FAILED)
    * @returns {Promise<{ id: string, status: string, updatedAt: Date }>} Updated emergency request
     */
    async updateEmergencyRequestStatus(id, status) {
      return prisma.emergencyRequest.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });
    },

    /**
     * Count emergency requests
     * 
    * @param {Record<string, unknown>} [where] - Filter conditions
     * @returns {Promise<number>} Count of emergency requests
     */
    async countEmergencyRequests(where = {}) {
      return prisma.emergencyRequest.count({ where });
    },
  };
}
