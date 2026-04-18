import { logger } from "../../utils/logger.js";
import {
  EMERGENCY_REQUEST_STATUSES,
  isEmergencyRequestStatus,
} from "./domain/emergency.constants.js";
import type { AppError } from "../../types/errors.js";
import type {
  EmergencyRequestStatus,
  EmergencyService as EmergencyServiceType,
  EmergencyType,
  GeoLocation,
} from "../../types/index.js";

type EmergencyRequestSummary = {
  id: string;
  emergencyTypes: string[];
  emergencyServices: string[];
  description: string;
  photoUri: string | null;
  lat: number;
  lng: number;
  timestamp: Date;
  status: string;
  createdAt: Date;
};

type CreateEmergencyRequestCommand = {
  requesterUserId: string | null;
  emergencyTypes: EmergencyType[];
  emergencyServices: EmergencyServiceType[];
  description: string;
  photoUri: string | null;
  location: GeoLocation;
  timestamp?: string;
};

type EmergencyListOptions = {
  status?: EmergencyRequestStatus;
  limit?: number;
  offset?: number;
  userId?: string;
};

type EmergencyRepo = {
  listEmergencyRequests: (options?: EmergencyListOptions) => Promise<EmergencyRequestSummary[]>;
  countEmergencyRequests: (where?: Record<string, unknown>) => Promise<number>;
  createEmergencyRequest: (input: {
    requesterUserId: string | null;
    emergencyTypes: EmergencyType[];
    emergencyServices: EmergencyServiceType[];
    description: string;
    photoUri: string | null;
    lat: number;
    lng: number;
    timestamp: Date;
    status: string;
  }) => Promise<EmergencyRequestSummary>;
  findEmergencyRequestById: (id: string) => Promise<unknown | null>;
  updateEmergencyRequestStatus: (
    id: string,
    status: string,
  ) => Promise<{ id: string; status: string }>;
};

type NotificationsService = {
  notifyEmergencyServices?: (input: {
    emergencyRequestId: string;
    emergencyTypes: EmergencyType[];
    emergencyServices: EmergencyServiceType[];
    location: GeoLocation;
    description: string;
  }) => Promise<unknown>;
};

type CentralUnitService = {
  sendEmergencyToCentralUnit?: (input: {
    emergencyRequestId: string;
    emergencyTypes: EmergencyType[];
    emergencyServices: EmergencyServiceType[];
    description: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    photoUri: string | null;
    requesterUserId: string | null;
  }) => Promise<unknown>;
};

type EmergencyService = {
  createEmergencyRequest: (
    params: CreateEmergencyRequestCommand,
  ) => Promise<EmergencyRequestSummary>;
  getEmergencyRequest: (emergencyRequestId: string) => Promise<unknown | null>;
  listEmergencyRequests: (options?: EmergencyListOptions) => Promise<{
    data: EmergencyRequestSummary[];
    total: number;
    limit: number;
    offset: number;
  }>;
  updateEmergencyRequestStatus: (
    emergencyRequestId: string,
    status: string,
  ) => Promise<{ id: string; status: string }>;
};

/**
 * Emergency Service
 * Handles business logic for emergency requests
 * 
 * @param deps - Service dependencies
 */
export function createEmergencyService({
  emergencyRepo,
  notificationsService,
  centralUnitService,
}: {
  emergencyRepo: EmergencyRepo;
  notificationsService?: NotificationsService;
  centralUnitService?: CentralUnitService;
}): EmergencyService {
  return {
    /**
     * Create a new emergency request
     * Validates data, persists to database, and notifies emergency services
     * 
     * @param params - Emergency request parameters
     */
    async createEmergencyRequest({
      requesterUserId,
      emergencyTypes,
      emergencyServices,
      description,
      photoUri,
      location,
      timestamp,
    }) {
      // Use provided timestamp or current time
      const emergencyTimestamp = timestamp ? new Date(timestamp) : new Date();

      logger.info({
        requesterUserId,
        emergencyTypes,
        emergencyServices,
        location,
        timestamp: emergencyTimestamp,
      }, "Creating emergency request");

      // Create the emergency request in the database
      const created = await emergencyRepo.createEmergencyRequest({
        requesterUserId,
        emergencyTypes,
        emergencyServices,
        description,
        photoUri: photoUri || null,
        lat: location.lat,
        lng: location.lng,
        timestamp: emergencyTimestamp,
        status: "QUEUED",
      });

      logger.info({
        emergencyRequestId: created.id,
      }, "Emergency request created successfully");

      // Best-effort: Send to Central Unit for coordination and dispatch
      if (centralUnitService?.sendEmergencyToCentralUnit) {
        centralUnitService
          .sendEmergencyToCentralUnit({
            emergencyRequestId: created.id,
            emergencyTypes,
            emergencyServices,
            description,
            latitude: location.lat,
            longitude: location.lng,
            timestamp: emergencyTimestamp,
            photoUri: photoUri || null,
            requesterUserId,
          })
          .catch((err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : "unknown error";
            logger.error({
              emergencyRequestId: created.id,
              error: errorMessage,
            }, "Failed to send emergency to Central Unit");
          });
      }

      // Best-effort: Notify emergency services via FCM or other channels
      if (notificationsService?.notifyEmergencyServices) {
        notificationsService
          .notifyEmergencyServices({
            emergencyRequestId: created.id,
            emergencyTypes,
            emergencyServices,
            location,
            description,
          })
          .catch((err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : "unknown error";
            logger.error({
              emergencyRequestId: created.id,
              error: errorMessage,
            }, "Failed to notify emergency services");
          });
      }

      return created;
    },

    /**
     * Get emergency request by ID
     * 
    * @param emergencyRequestId - Emergency request ID
     */
      async getEmergencyRequest(emergencyRequestId: string) {
      logger.info({ emergencyRequestId }, "Fetching emergency request");

      const emergencyRequest = await emergencyRepo.findEmergencyRequestById(emergencyRequestId);

      if (!emergencyRequest) {
        logger.warn({ emergencyRequestId }, "Emergency request not found");
        return null;
      }

      return emergencyRequest;
    },

    /**
     * List emergency requests with filtering
     * 
    * @param options - Query options
     */
    async listEmergencyRequests(options: EmergencyListOptions = {}) {
      logger.info(options, "Listing emergency requests");

      const requests = await emergencyRepo.listEmergencyRequests(options);
      const countFilters = {
        ...(options.status ? { status: options.status } : {}),
        ...(options.userId ? { requesterUserId: options.userId } : {}),
      };
      const total = await emergencyRepo.countEmergencyRequests(
        countFilters
      );

      return {
        data: requests,
        total,
        limit: options.limit || 20,
        offset: options.offset || 0,
      };
    },

    /**
     * Update emergency request status
     * 
    * @param emergencyRequestId - Emergency request ID
    * @param status - New status (QUEUED, SENT, FAILED)
     */
      async updateEmergencyRequestStatus(emergencyRequestId: string, status: string) {
      logger.info({
        emergencyRequestId,
        status,
      }, "Updating emergency request status");

      if (!isEmergencyRequestStatus(status)) {
        const error = new Error(
          `Invalid status. Must be one of: ${EMERGENCY_REQUEST_STATUSES.join(", ")}`
        ) as AppError;
        error.statusCode = 400;
        error.expose = true;
        throw error;
      }

      const updated = await emergencyRepo.updateEmergencyRequestStatus(
        emergencyRequestId,
        status
      );

      logger.info({
        emergencyRequestId: updated.id,
        status: updated.status,
      }, "Emergency request status updated");

      return updated;
    },
  };
}
