import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";

type ProfileController = {
  getProfile: RequestHandler;
  getMedicalInfo: RequestHandler;
  updateMedicalInfo: RequestHandler;
  getIdentification: RequestHandler;
  updateIdentification: RequestHandler;
  getPersonalInfo: RequestHandler;
  updatePersonalInfo: RequestHandler;
};

/**
 * Create profile router with all /me/* endpoints
 * All endpoints are protected by requireAuth middleware
 */
export function createProfileRouter({ profileController }: { profileController: ProfileController }) {
  const router = Router();

  // Complete profile endpoint
  router.get("/me/profile", requireAuth, profileController.getProfile);

  // Medical information endpoints
  router.get("/me/medical-info", requireAuth, profileController.getMedicalInfo);
  router.put("/me/medical-info", requireAuth, profileController.updateMedicalInfo);

  // Identification data endpoints
  router.get("/me/identification", requireAuth, profileController.getIdentification);
  router.put("/me/identification", requireAuth, profileController.updateIdentification);

  // Personal information endpoints
  router.get("/me/personal-info", requireAuth, profileController.getPersonalInfo);
  router.patch("/me/personal-info", requireAuth, profileController.updatePersonalInfo);

  return router;
}

const notWiredHandler: RequestHandler = (_req, res) =>
  res.status(500).json({ message: "Router not wired" });

const unconfiguredProfileController: ProfileController = {
  getProfile: notWiredHandler,
  getMedicalInfo: notWiredHandler,
  updateMedicalInfo: notWiredHandler,
  getIdentification: notWiredHandler,
  updateIdentification: notWiredHandler,
  getPersonalInfo: notWiredHandler,
  updatePersonalInfo: notWiredHandler,
};

// Backward-compatible default export for app wiring
export const profileRouter = createProfileRouter({
  profileController: unconfiguredProfileController,
});
