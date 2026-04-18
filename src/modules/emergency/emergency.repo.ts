type EmergencyRequestSummary = {
  id: string;
  requesterUserId?: string | null;
  emergencyTypes: string[];
  emergencyServices: string[];
  description: string;
  photoUri: string | null;
  lat: number;
  lng: number;
  timestamp: Date;
  status: string;
  createdAt: Date;
  requester?: {
    id: string;
    fullName: string | null;
    phoneNumber: string | null;
  } | null;
};

type EmergencyRequestDetails = {
  id: string;
  requesterUserId: string | null;
  emergencyTypes: string[];
  emergencyServices: string[];
  description: string;
  photoUri: string | null;
  lat: number;
  lng: number;
  timestamp: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requester: {
    id: string;
    fullName: string | null;
    email: string;
    phoneNumber: string | null;
    bloodType: string | null;
    allergies: string[] | null;
    chronicConditions: string[] | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  } | null;
};

type EmergencyRequestCreateInput = {
  requesterUserId: string | null;
  emergencyTypes: string[];
  emergencyServices: string[];
  description: string;
  photoUri: string | null;
  lat: number;
  lng: number;
  timestamp: Date;
  status?: string;
};

type EmergencyListOptions = {
  status?: string;
  limit?: number;
  offset?: number;
  userId?: string;
};

type EmergencyPrismaLike = {
  emergencyRequest: {
    create: (input: { data: unknown; select: unknown }) => Promise<EmergencyRequestSummary>;
    findUnique: (input: {
      where: { id: string };
      select: unknown;
    }) => Promise<EmergencyRequestDetails | null>;
    findMany: (input: {
      where: Record<string, unknown>;
      select: unknown;
      orderBy: { timestamp: "desc" };
      take: number;
      skip: number;
    }) => Promise<EmergencyRequestSummary[]>;
    update: (input: {
      where: { id: string };
      data: { status: string };
      select: unknown;
    }) => Promise<{ id: string; status: string; updatedAt: Date }>;
    count: (input: { where: Record<string, unknown> }) => Promise<number>;
  };
};

type EmergencyRepo = {
  createEmergencyRequest: (data: EmergencyRequestCreateInput) => Promise<EmergencyRequestSummary>;
  findEmergencyRequestById: (id: string) => Promise<EmergencyRequestDetails | null>;
  listEmergencyRequests: (options?: EmergencyListOptions) => Promise<EmergencyRequestSummary[]>;
  updateEmergencyRequestStatus: (
    id: string,
    status: string,
  ) => Promise<{ id: string; status: string; updatedAt: Date }>;
  countEmergencyRequests: (where?: Record<string, unknown>) => Promise<number>;
};

/**
 * Emergency Repository
 * Handles all database operations for emergency requests
 * 
 * @param prisma - Prisma client instance
 */
export function createEmergencyRepo(prisma: EmergencyPrismaLike): EmergencyRepo {
  return {
    /**
     * Create a new emergency request
     * 
    * @param data - Emergency request data
     */
    async createEmergencyRequest(data: EmergencyRequestCreateInput) {
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
     * @param id - Emergency request ID
     */
    async findEmergencyRequestById(id: string) {
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
    * @param options - Query options
     */
    async listEmergencyRequests(options: EmergencyListOptions = {}) {
      const { status, limit = 20, offset = 0, userId } = options;

      const where: Record<string, unknown> = {};
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
     * @param id - Emergency request ID
     * @param status - New status (QUEUED, SENT, FAILED)
     */
    async updateEmergencyRequestStatus(id: string, status: string) {
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
    * @param where - Filter conditions
     */
    async countEmergencyRequests(where: Record<string, unknown> = {}) {
      return prisma.emergencyRequest.count({ where });
    },
  };
}
