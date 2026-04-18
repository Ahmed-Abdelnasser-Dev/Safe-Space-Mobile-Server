import { Router } from "express";
import type { RequestHandler } from "express";
import { upload } from "../../middleware/upload.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware.js";
import { emergencyCreateRateLimiter } from "../../middleware/rateLimit.middleware.js";

type EmergencyController = {
  createEmergencyRequestHandler: RequestHandler;
  getEmergencyRequestHandler: RequestHandler;
  listEmergencyRequestsHandler: RequestHandler;
  updateEmergencyRequestStatusHandler: RequestHandler;
};

/**
 * Create Emergency Router
 * Defines all emergency-related routes
 * 
 * @param deps - Router dependencies
 * @returns {Router} Express router instance
 */
export function createEmergencyRouter({
  emergencyController,
}: {
  emergencyController: EmergencyController;
}) {
  const router = Router();

  /**
   * POST /emergency/request
   * Create a new emergency request
   * 
   * Request Body:
   * - emergencyTypes: Array<EmergencyType> (required)
   * - emergencyServices: Array<EmergencyService> (required)
   * - description: string (required, max 500 chars)
   * - location: { lat: number, lng: number } (required)
   * - timestamp: ISO datetime string (optional, auto-generated)
   * - photo: file upload (optional)
   * 
   * Response: 201 Created
   */
  router.post(
    "/emergency/request",
    emergencyCreateRateLimiter,
    optionalAuth,
    upload.single("photo"), // Optional photo upload
    emergencyController.createEmergencyRequestHandler
  );

  /**
   * GET /emergency/request/:id
   * Get a specific emergency request by ID
   * Optional authentication - returns more details if authenticated
   * 
   * Response: 200 OK
   */
  router.get(
    "/emergency/request/:id",
    optionalAuth,
    emergencyController.getEmergencyRequestHandler
  );

  /**
   * GET /emergency/requests
   * List emergency requests
   * Optional authentication - non-admin users only see their own requests
   * 
   * Query Parameters:
   * - status: QUEUED | SENT | FAILED (optional)
   * - limit: number (default: 20, max: 100)
   * - offset: number (default: 0)
   * 
   * Response: 200 OK
   */
  router.get(
    "/emergency/requests",
    optionalAuth,
    emergencyController.listEmergencyRequestsHandler
  );

  /**
   * PATCH /emergency/request/:id/status
   * Update emergency request status
   * Admin only endpoint
   * 
   * Request Body:
   * - status: QUEUED | SENT | FAILED
   * 
   * Response: 200 OK
   */
  router.patch(
    "/emergency/request/:id/status",
    requireAuth, // Requires authentication
    emergencyController.updateEmergencyRequestStatusHandler
  );

  return router;
}

const notWiredHandler: RequestHandler = (_req, res) =>
  res.status(500).json({ message: "Router not wired" });

// Backward-compatible default export for app wiring
export const emergencyRouter = createEmergencyRouter({
  emergencyController: {
    createEmergencyRequestHandler: notWiredHandler,
    getEmergencyRequestHandler: notWiredHandler,
    listEmergencyRequestsHandler: notWiredHandler,
    updateEmergencyRequestStatusHandler: notWiredHandler,
  },
});
