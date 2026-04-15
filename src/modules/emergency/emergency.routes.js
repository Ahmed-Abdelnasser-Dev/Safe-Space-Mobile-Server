import { Router } from "express";
import { upload } from "../../middleware/upload.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.middleware.js";

/**
 * @typedef {{
 *   createEmergencyRequestHandler: import("express").RequestHandler,
 *   getEmergencyRequestHandler: import("express").RequestHandler,
 *   listEmergencyRequestsHandler: import("express").RequestHandler,
 *   updateEmergencyRequestStatusHandler: import("express").RequestHandler
 * }} EmergencyController
 */

/**
 * Create Emergency Router
 * Defines all emergency-related routes
 * 
 * @param {{ emergencyController: EmergencyController }} deps - Router dependencies
 * @returns {Router} Express router instance
 */
export function createEmergencyRouter({ emergencyController }) {
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

// Backward-compatible default export for app wiring
export const emergencyRouter = createEmergencyRouter({
  emergencyController: {
    createEmergencyRequestHandler: (req, res) =>
      res.status(500).json({ message: "Router not wired" }),
    getEmergencyRequestHandler: (req, res) =>
      res.status(500).json({ message: "Router not wired" }),
    listEmergencyRequestsHandler: (req, res) =>
      res.status(500).json({ message: "Router not wired" }),
    updateEmergencyRequestStatusHandler: (req, res) =>
      res.status(500).json({ message: "Router not wired" }),
  },
});
