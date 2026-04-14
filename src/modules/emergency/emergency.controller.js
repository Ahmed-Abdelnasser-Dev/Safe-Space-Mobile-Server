import { createEmergencyRequestSchema, getEmergencyRequestSchema, listEmergencyRequestsSchema } from "./emergency.validators.js";
import { parseEmergencyCreateRequest } from "./application/emergency.request-parser.js";
import {
  buildEmergencyListOptions,
  canManageEmergencyRequestStatus,
} from "./application/emergency.access-policy.js";
import { EMERGENCY_REQUEST_STATUSES } from "./domain/emergency.constants.js";

/**
 * Emergency Controller
 * Handles HTTP requests for emergency operations
 * 
 * @param {Object} deps - Controller dependencies
 * @param {Object} deps.emergencyService - Emergency service instance
 */
export function createEmergencyController({ emergencyService }) {
  return {
    /**
     * Handler for creating a new emergency request
     * POST /emergency/request
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     */
    createEmergencyRequestHandler: async (req, res, next) => {
      try {
        const bodyData = parseEmergencyCreateRequest({
          body: req.body,
          file: req.file,
        });

        // Validate only schema-owned fields; attachments stay outside payload schema.
        const body = createEmergencyRequestSchema.parse({
          emergencyTypes: bodyData.emergencyTypes,
          emergencyServices: bodyData.emergencyServices,
          description: bodyData.description,
          location: bodyData.location,
          timestamp: bodyData.timestamp,
        });

        // Get authenticated user ID if available
        const requesterUserId = req.userId || null;

        // Create emergency request
        const result = await emergencyService.createEmergencyRequest({
          requesterUserId,
          emergencyTypes: body.emergencyTypes,
          emergencyServices: body.emergencyServices,
          description: body.description,
          photoUri: bodyData.photoUri,
          location: body.location,
          timestamp: body.timestamp,
        });

        res.status(201).json({
          success: true,
          message: "Emergency request created successfully",
          data: result,
        });
      } catch (err) {
        next(err);
      }
    },

    /**
     * Handler for getting a single emergency request by ID
     * GET /emergency/request/:id
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     */
    getEmergencyRequestHandler: async (req, res, next) => {
      try {
        const params = getEmergencyRequestSchema.parse({ id: req.params.id });

        const emergencyRequest = await emergencyService.getEmergencyRequest(params.id);

        if (!emergencyRequest) {
          return res.status(404).json({
            success: false,
            message: "Emergency request not found",
          });
        }

        res.status(200).json({
          success: true,
          data: emergencyRequest,
        });
      } catch (err) {
        next(err);
      }
    },

    /**
     * Handler for listing emergency requests
     * GET /emergency/requests
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     */
    listEmergencyRequestsHandler: async (req, res, next) => {
      try {
        const query = listEmergencyRequestsSchema.parse({
          status: req.query.status,
          limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
        });

        const listPolicy = buildEmergencyListOptions({
          query,
          userId: req.userId || null,
          userRole: req.userRole,
        });

        if (listPolicy.denied) {
          return res.status(200).json({
            success: true,
            data: [],
            meta: {
              total: 0,
              limit: query?.limit || 20,
              offset: query?.offset || 0,
            },
          });
        }

        const result = await emergencyService.listEmergencyRequests(listPolicy.options);

        res.status(200).json({
          success: true,
          data: result.data,
          meta: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
          },
        });
      } catch (err) {
        next(err);
      }
    },

    /**
     * Handler for updating emergency request status
     * PATCH /emergency/request/:id/status
     * Admin only endpoint
     * 
     * @param {import('express').Request} req - Express request
     * @param {import('express').Response} res - Express response
     * @param {import('express').NextFunction} next - Express next function
     */
    updateEmergencyRequestStatusHandler: async (req, res, next) => {
      try {
        const params = getEmergencyRequestSchema.parse({ id: req.params.id });
        const { status } = req.body;

        if (!canManageEmergencyRequestStatus(req.userRole)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden",
          });
        }

        if (!status) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${EMERGENCY_REQUEST_STATUSES.join(", ")}`,
          });
        }

        const updated = await emergencyService.updateEmergencyRequestStatus(
          params.id,
          status
        );

        res.status(200).json({
          success: true,
          message: "Emergency request status updated",
          data: updated,
        });
      } catch (err) {
        next(err);
      }
    },
  };
}
