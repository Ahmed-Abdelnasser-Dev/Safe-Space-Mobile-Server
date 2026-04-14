import { reportAccidentSchema } from "./accidents.validators.js";
import { parseAccidentReportRequest } from "./application/accident.request-parser.js";

export function createAccidentsController({ accidentsService }) {
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
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
