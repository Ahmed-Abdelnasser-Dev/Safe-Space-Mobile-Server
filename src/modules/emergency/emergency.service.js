import { logger } from "../../utils/logger.js";
import {
  EMERGENCY_REQUEST_STATUSES,
  isEmergencyRequestStatus,
} from "./domain/emergency.constants.js";

/** @typedef {import("../../types/errors").AppError} AppError */
/** @typedef {import("../../types/index").GeoLocation} GeoLocation */

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
 *   requesterUserId: string | null,
 *   emergencyTypes: import("../../types/index").EmergencyType[],
 *   emergencyServices: import("../../types/index").EmergencyService[],
 *   description: string,
 *   photoUri: string | null,
 *   location: GeoLocation,
 *   timestamp?: string
 * }} CreateEmergencyRequestCommand
 */

/**
 * @typedef {{
 *   status?: import("../../types/index").EmergencyRequestStatus,
 *   limit?: number,
 *   offset?: number,
 *   userId?: string
 * }} EmergencyListOptions
 */

/**
 * @typedef {{
 *   listEmergencyRequests: (options?: EmergencyListOptions) => Promise<EmergencyRequestSummary[]>,
 *   countEmergencyRequests: (where?: Record<string, unknown>) => Promise<number>,
 *   createEmergencyRequest: (input: {
 *     requesterUserId: string | null,
 *     emergencyTypes: import("../../types/index").EmergencyType[],
 *     emergencyServices: import("../../types/index").EmergencyService[],
 *     description: string,
 *     photoUri: string | null,
 *     lat: number,
 *     lng: number,
 *     timestamp: Date,
 *     status: string
 *   }) => Promise<EmergencyRequestSummary>,
 *   findEmergencyRequestById: (id: string) => Promise<unknown | null>,
 *   updateEmergencyRequestStatus: (id: string, status: string) => Promise<{ id: string, status: string }>
 * }} EmergencyRepo
 */

/**
 * @typedef {{
 *   notifyEmergencyServices?: (input: {
 *     emergencyRequestId: string,
 *     emergencyTypes: import("../../types/index").EmergencyType[],
 *     emergencyServices: import("../../types/index").EmergencyService[],
 *     location: GeoLocation,
 *     description: string
 *   }) => Promise<unknown>
 * }} NotificationsService
 */

/**
 * @typedef {{
 *   sendEmergencyToCentralUnit?: (input: {
 *     emergencyRequestId: string,
 *     emergencyTypes: import("../../types/index").EmergencyType[],
 *     emergencyServices: import("../../types/index").EmergencyService[],
 *     description: string,
 *     latitude: number,
 *     longitude: number,
 *     timestamp: Date,
 *     photoUri: string | null,
 *     requesterUserId: string | null
 *   }) => Promise<unknown>
 * }} CentralUnitService
 */

/**
 * Emergency Service
 * Handles business logic for emergency requests
 * 
 * @param {{
 *   emergencyRepo: EmergencyRepo,
 *   notificationsService?: NotificationsService,
 *   centralUnitService?: CentralUnitService
 * }} deps - Service dependencies
 */
export function createEmergencyService({ emergencyRepo, notificationsService, centralUnitService }) {
  return {
    /**
     * Create a new emergency request
     * Validates data, persists to database, and notifies emergency services
     * 
     * @param {CreateEmergencyRequestCommand} params - Emergency request parameters
     * @returns {Promise<EmergencyRequestSummary>} Created emergency request
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

      logger.info("Creating emergency request", {
        requesterUserId,
        emergencyTypes,
        emergencyServices,
        location,
        timestamp: emergencyTimestamp,
      });

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

      logger.info("Emergency request created successfully", {
        emergencyRequestId: created.id,
      });

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
          .catch((err) => {
            logger.error("Failed to send emergency to Central Unit", {
              emergencyRequestId: created.id,
              error: err.message,
            });
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
          .catch((err) => {
            logger.error("Failed to notify emergency services", {
              emergencyRequestId: created.id,
              error: err.message,
            });
          });
      }

      return created;
    },

    /**
     * Get emergency request by ID
     * 
     * @param {string} emergencyRequestId - Emergency request ID
    * @returns {Promise<unknown | null>} Emergency request or null if not found
     */
    async getEmergencyRequest(emergencyRequestId) {
      logger.info("Fetching emergency request", { emergencyRequestId });

      const emergencyRequest = await emergencyRepo.findEmergencyRequestById(emergencyRequestId);

      if (!emergencyRequest) {
        logger.warn("Emergency request not found", { emergencyRequestId });
        return null;
      }

      return emergencyRequest;
    },

    /**
     * List emergency requests with filtering
     * 
    * @param {EmergencyListOptions} [options] - Query options
    * @returns {Promise<{ data: EmergencyRequestSummary[], total: number, limit: number, offset: number }>} List of emergency requests with metadata
     */
    async listEmergencyRequests(options = {}) {
      logger.info("Listing emergency requests", options);

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
     * @param {string} emergencyRequestId - Emergency request ID
     * @param {string} status - New status (QUEUED, SENT, FAILED)
    * @returns {Promise<{ id: string, status: string }>} Updated emergency request
     */
    async updateEmergencyRequestStatus(emergencyRequestId, status) {
      logger.info("Updating emergency request status", {
        emergencyRequestId,
        status,
      });

      if (!isEmergencyRequestStatus(status)) {
        /** @type {AppError} */
        const error = new Error(
          `Invalid status. Must be one of: ${EMERGENCY_REQUEST_STATUSES.join(", ")}`
        );
        error.statusCode = 400;
        error.expose = true;
        throw error;
      }

      const updated = await emergencyRepo.updateEmergencyRequestStatus(
        emergencyRequestId,
        status
      );

      logger.info("Emergency request status updated", {
        emergencyRequestId: updated.id,
        status: updated.status,
      });

      return updated;
    },
  };
}
