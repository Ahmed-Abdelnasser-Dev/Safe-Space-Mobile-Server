import { sendAccidentSchema, receiveAccidentSchema } from "./centralUnit.validators.js";
import { enforceCentralUnitInboundAuth } from "./centralUnit.inboundAuth.js";

/**
 * @typedef {{
 *   accidentId: string,
 *   description: string,
 *   latitude: number,
 *   longitude: number,
 *   severity: "low" | "medium" | "high",
 *   media: import("../../types/index").AccidentMediaInput[]
 * }} SendAccidentToCentralUnitInput
 */

/**
 * @typedef {{
 *   centralUnitAccidentId: string,
 *   occurredAt: string,
 *   location: import("../../types/index").GeoLocation
 * }} ReceiveAccidentFromCentralUnitInput
 */

/**
 * @typedef {{
 *   sendAccidentToCentralUnit: (input: SendAccidentToCentralUnitInput) => Promise<{ ok: true, centralUnitReferenceId: string } | { ok: false, reason: "not_configured" }>,
 *   receiveAccidentFromCentralUnit: (input: ReceiveAccidentFromCentralUnitInput) => Promise<{ ok: true }>
 * }} CentralUnitService
 */

/**
 * @param {{ centralUnitService: CentralUnitService }} deps
 */
export function createCentralUnitController({ centralUnitService }) {
  return {
    /** @type {import("express").RequestHandler} */
    sendAccidentToCentralUnitHandler: async (req, res, next) => {
      try {
        const body = sendAccidentSchema.parse(req.body);
        const result = await centralUnitService.sendAccidentToCentralUnit(body);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    receiveAccidentFromCentralUnitHandler: async (req, res, next) => {
      try {
        enforceCentralUnitInboundAuth(req);
        const body = receiveAccidentSchema.parse(req.body);
        const result = await centralUnitService.receiveAccidentFromCentralUnit(body);
        res.status(202).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}

