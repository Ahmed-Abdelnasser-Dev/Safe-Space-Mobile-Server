import { Router } from "express";
import type { RequestHandler } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";

type CentralUnitController = {
  sendAccidentToCentralUnitHandler: RequestHandler;
  receiveAccidentFromCentralUnitHandler: RequestHandler;
};

export function createCentralUnitRouter({
  centralUnitController,
}: {
  centralUnitController: CentralUnitController;
}) {
  const router = Router();
  router.post(
    "/central-unit/send-accident-to-central-unit",
    requireAuth,
    centralUnitController.sendAccidentToCentralUnitHandler
  );
  router.post("/central-unit/receive-accident-from-central-unit", centralUnitController.receiveAccidentFromCentralUnitHandler);
  return router;
}

const notWiredHandler: RequestHandler = (_req, res) =>
  res.status(500).json({ message: "Router not wired" });

export const centralUnitRouter = createCentralUnitRouter({
  centralUnitController: {
    sendAccidentToCentralUnitHandler: notWiredHandler,
    receiveAccidentFromCentralUnitHandler: notWiredHandler,
  },
});

