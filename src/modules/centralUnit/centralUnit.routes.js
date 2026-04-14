import { Router } from "express";

/**
 * @typedef {{
 *   sendAccidentToCentralUnitHandler: import("express").RequestHandler,
 *   receiveAccidentFromCentralUnitHandler: import("express").RequestHandler
 * }} CentralUnitController
 */

/**
 * @param {{ centralUnitController: CentralUnitController }} deps
 */
export function createCentralUnitRouter({ centralUnitController }) {
  const router = Router();
  router.post("/central-unit/send-accident-to-central-unit", centralUnitController.sendAccidentToCentralUnitHandler);
  router.post("/central-unit/receive-accident-from-central-unit", centralUnitController.receiveAccidentFromCentralUnitHandler);
  return router;
}

export const centralUnitRouter = createCentralUnitRouter({
  centralUnitController: {
    sendAccidentToCentralUnitHandler: (req, res) => res.status(500).json({ message: "Router not wired" }),
    receiveAccidentFromCentralUnitHandler: (req, res) => res.status(500).json({ message: "Router not wired" }),
  },
});

