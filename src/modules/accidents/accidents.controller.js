import { reportAccidentSchema } from "./accidents.validators.js";
import { parseAccidentReportRequest } from "./application/accident.request-parser.js";

/**
 * @typedef {{
 *   reporterUserId: string | null,
 *   location: import("../../types/index").GeoLocation,
 *   message?: string,
 *   occurredAt: string,
 *   media: import("../../types/index").AccidentMediaInput[]
 * }} ReportAccidentCommand
 */

/**
 * @typedef {{
 *   reportAccident: (input: ReportAccidentCommand) => Promise<{ accidentId: string, status: string }>
 * }} AccidentsService
 */

/**
 * @param {{ accidentsService: AccidentsService }} deps
 */
export function createAccidentsController({ accidentsService }) {
  return {
    /** @type {import("express").RequestHandler} */
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
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
