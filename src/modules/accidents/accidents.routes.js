import { Router } from "express";
import { upload } from "../../middleware/upload.js";
import { optionalAuth } from "../../middleware/auth.middleware.js";

/**
 * @typedef {{
 *   reportAccidentHandler: import("express").RequestHandler
 * }} AccidentsController
 */

/**
 * @param {{ accidentsController: AccidentsController }} deps
 */
export function createAccidentsRouter({ accidentsController }) {
  const router = Router();
  router.post(
    "/accident/report-accident",
    optionalAuth,
    upload.array("media"),
    accidentsController.reportAccidentHandler,
  );
  return router;
}

// Backward-compatible default export for app wiring
export const accidentsRouter = createAccidentsRouter({
  accidentsController: {
    reportAccidentHandler: (req, res) =>
      res.status(500).json({ message: "Router not wired" }),
  },
});
