import { Router } from "express";
import type { RequestHandler } from "express";
import { upload } from "../../middleware/upload.js";
import { optionalAuth } from "../../middleware/auth.middleware.js";

type AccidentsController = {
  reportAccidentHandler: RequestHandler;
};

export function createAccidentsRouter({
  accidentsController,
}: {
  accidentsController: AccidentsController;
}) {
  const router = Router();
  router.post(
    "/accident/report-accident",
    optionalAuth,
    upload.array("media"),
    accidentsController.reportAccidentHandler,
  );
  return router;
}

const notWiredHandler: RequestHandler = (_req, res) =>
  res.status(500).json({ message: "Router not wired" });

// Backward-compatible default export for app wiring
export const accidentsRouter = createAccidentsRouter({
  accidentsController: {
    reportAccidentHandler: notWiredHandler,
  },
});
