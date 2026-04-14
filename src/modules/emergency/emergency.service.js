import { logger } from "../../utils/logger.js";
import {
  EMERGENCY_REQUEST_STATUSES,
  isEmergencyRequestStatus,
} from "./domain/emergency.constants.js";

/**
 * Emergency Service
 * Handles business logic for emergency requests
 * 
 * @param {Object} deps - Service dependencies
 * @param {Object} deps.emergencyRepo - Emergency repository
 * @param {Object} deps.notificationsService - Notifications service (optional)
 * @param {Object} deps.centralUnitService - Central unit service (optional)
 */
export function createEmergencyService({ emergencyRepo, notificationsService, centralUnitService }) {
  return {
    /**
     * Create a new emergency request
     * Validates data, persists to database, and notifies emergency services
     * 
     * @param {Object} params - Emergency request parameters
     * @param {string|null} params.requesterUserId - User ID making the request
     * @param {Array<string>} params.emergencyTypes - Types of emergency
     * @param {Array<string>} params.emergencyServices - Services needed
     * @param {string} params.description - Description of the emergency
     * @param {string|null} params.photoUri - Optional photo URI
     * @param {Object} params.location - Location coordinates
     * @param {number} params.location.lat - Latitude
     * @param {number} params.location.lng - Longitude
     * @param {string} params.timestamp - ISO timestamp
     * @returns {Promise<Object>} Created emergency request
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
     * @returns {Promise<Object|null>} Emergency request or null if not found
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
     * @param {Object} options - Query options
     * @param {string} options.status - Filter by status
     * @param {number} options.limit - Maximum results
     * @param {number} options.offset - Results to skip
     * @param {string} options.userId - Filter by user
     * @returns {Promise<Object>} List of emergency requests with metadata
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
     * @returns {Promise<Object>} Updated emergency request
     */
    async updateEmergencyRequestStatus(emergencyRequestId, status) {
      logger.info("Updating emergency request status", {
        emergencyRequestId,
        status,
      });

      if (!isEmergencyRequestStatus(status)) {
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
