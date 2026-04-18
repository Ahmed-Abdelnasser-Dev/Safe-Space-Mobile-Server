import { sendAccidentSchema, receiveAccidentSchema } from "./centralUnit.validators.js";
import { enforceCentralUnitInboundAuth } from "./centralUnit.inboundAuth.js";
import type { RequestHandler } from "express";
import type { AccidentMediaInput, GeoLocation } from "../../types/index.js";

type SendAccidentToCentralUnitInput = {
  accidentId: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: "low" | "medium" | "high";
  media: AccidentMediaInput[];
};

type ReceiveAccidentFromCentralUnitInput = {
  centralUnitAccidentId: string;
  occurredAt: string;
  location: GeoLocation;
};

type CentralUnitService = {
  sendAccidentToCentralUnit: (input: SendAccidentToCentralUnitInput) => Promise<{ ok: true; centralUnitReferenceId: string } | { ok: false; reason: "not_configured" }>;
  receiveAccidentFromCentralUnit: (input: ReceiveAccidentFromCentralUnitInput) => Promise<{ ok: true }>;
};

type CentralUnitController = {
  sendAccidentToCentralUnitHandler: RequestHandler;
  receiveAccidentFromCentralUnitHandler: RequestHandler;
};

export function createCentralUnitController({
  centralUnitService,
}: {
  centralUnitService: CentralUnitService;
}): CentralUnitController {
  return {
    sendAccidentToCentralUnitHandler: async (req, res, next) => {
      try {
        if (req.userRole !== "ADMIN") {
          return res.status(403).json({
            success: false,
            message: "Forbidden",
          });
        }

        const body = sendAccidentSchema.parse(req.body);
        const result = await centralUnitService.sendAccidentToCentralUnit(body);
        return res.json(result);
      } catch (err) {
        return next(err);
      }
    },

    receiveAccidentFromCentralUnitHandler: async (req, res, next) => {
      try {
        enforceCentralUnitInboundAuth(req);
        const body = receiveAccidentSchema.parse(req.body);
        const result = await centralUnitService.receiveAccidentFromCentralUnit(body);
        return res.status(202).json(result);
      } catch (err) {
        return next(err);
      }
    },
  };
}

