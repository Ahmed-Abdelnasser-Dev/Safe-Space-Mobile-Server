import { reportAccidentSchema } from "./accidents.validators.js";
import { parseAccidentReportRequest } from "./application/accident.request-parser.js";
import type { RequestHandler } from "express";
import type { AccidentMediaInput, GeoLocation } from "../../types/index.js";

type ReportAccidentCommand = {
  reporterUserId: string | null;
  location: GeoLocation;
  message?: string;
  occurredAt: string;
  media: AccidentMediaInput[];
};

type AccidentsService = {
  reportAccident: (input: ReportAccidentCommand) => Promise<{ accidentId: string; status: string }>;
};

type AccidentsController = {
  reportAccidentHandler: RequestHandler;
};

export function createAccidentsController({
  accidentsService,
}: {
  accidentsService: AccidentsService;
}): AccidentsController {
  return {
    reportAccidentHandler: async (req, res, next) => {
      try {
        const bodyData = parseAccidentReportRequest({
          body: req.body,
          files: req.files,
        });

        const body = reportAccidentSchema.parse(bodyData);
        const result = await accidentsService.reportAccident({
          reporterUserId: req.userId || null,
          location: body.location,
          message: body.message,
          occurredAt: body.occurredAt,
          media: body.media || [],
        });
        return res.status(201).json(result);
      } catch (err) {
        return next(err);
      }
    },
  };
}
