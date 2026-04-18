import { createEmergencyRequestSchema, getEmergencyRequestSchema, listEmergencyRequestsSchema } from "./emergency.validators.js";
import { parseEmergencyCreateRequest } from "./application/emergency.request-parser.js";
import {
  buildEmergencyListOptions,
  canManageEmergencyRequestStatus,
} from "./application/emergency.access-policy.js";
import { EMERGENCY_REQUEST_STATUSES } from "./domain/emergency.constants.js";
import type {
  EmergencyService as EmergencyServiceType,
  EmergencyType,
  GeoLocation,
} from "../../types/index.js";
import type { RequestHandler } from "express";

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
  status?: "QUEUED" | "SENT" | "FAILED";
  limit?: number;
  offset?: number;
  userId?: string;
};

type EmergencyService = {
  createEmergencyRequest: (input: CreateEmergencyRequestCommand) => Promise<unknown>;
  getEmergencyRequest: (id: string) => Promise<unknown | null>;
  listEmergencyRequests: (options?: EmergencyListOptions) => Promise<{ data: unknown[]; total: number; limit: number; offset: number }>;
  updateEmergencyRequestStatus: (id: string, status: string) => Promise<unknown>;
};

type EmergencyController = {
  createEmergencyRequestHandler: RequestHandler;
  getEmergencyRequestHandler: RequestHandler;
  listEmergencyRequestsHandler: RequestHandler;
  updateEmergencyRequestStatusHandler: RequestHandler;
};

function extractRequesterUserId(value: unknown): string | null | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const requesterUserId = (value as { requesterUserId?: unknown }).requesterUserId;
  if (requesterUserId === null || typeof requesterUserId === "string") {
    return requesterUserId;
  }

  return undefined;
}

/**
 * Emergency Controller
 * Handles HTTP requests for emergency operations
 * 
 * @param deps - Controller dependencies
 */
export function createEmergencyController({
  emergencyService,
}: {
  emergencyService: EmergencyService;
}): EmergencyController {
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

        return res.status(201).json({
          success: true,
          message: "Emergency request created successfully",
          data: result,
        });
      } catch (err) {
        return next(err);
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

        const isAdmin = req.userRole === "ADMIN";
        if (!isAdmin && !req.userId) {
          return res.status(403).json({
            success: false,
            message: "Forbidden",
          });
        }

        const emergencyRequest = await emergencyService.getEmergencyRequest(params.id);

        if (!emergencyRequest) {
          return res.status(404).json({
            success: false,
            message: "Emergency request not found",
          });
        }

        const requesterUserId = extractRequesterUserId(emergencyRequest);

        if (!isAdmin) {
          if (requesterUserId !== req.userId) {
            return res.status(404).json({
              success: false,
              message: "Emergency request not found",
            });
          }
        }

        return res.status(200).json({
          success: true,
          data: emergencyRequest,
        });
      } catch (err) {
        return next(err);
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
        const rawLimit = typeof req.query.limit === "string" ? req.query.limit : undefined;
        const rawOffset = typeof req.query.offset === "string" ? req.query.offset : undefined;
        const query = listEmergencyRequestsSchema.parse({
          status: req.query.status,
          limit: rawLimit ? parseInt(rawLimit, 10) : undefined,
          offset: rawOffset ? parseInt(rawOffset, 10) : undefined,
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

        return res.status(200).json({
          success: true,
          data: result.data,
          meta: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
          },
        });
      } catch (err) {
        return next(err);
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
        const status =
          req.body && typeof req.body === "object" && "status" in req.body
            ? (req.body as { status?: unknown }).status
            : undefined;

        if (!canManageEmergencyRequestStatus(req.userRole)) {
          return res.status(403).json({
            success: false,
            message: "Forbidden",
          });
        }

        if (typeof status !== "string" || !status) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${EMERGENCY_REQUEST_STATUSES.join(", ")}`,
          });
        }

        const updated = await emergencyService.updateEmergencyRequestStatus(
          params.id,
          status
        );

        return res.status(200).json({
          success: true,
          message: "Emergency request status updated",
          data: updated,
        });
      } catch (err) {
        return next(err);
      }
    },
  };
}
