import { z } from "zod";

/** @typedef {import("../../types/index.js").ReportAccidentInput} ReportAccidentInput */

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const mediaSchema = z
  .array(
    z.object({
      type: z.enum(["image", "video"]),
      url: z.string(),
    }),
  )
  .default([]);

export const reportAccidentSchema = z.object({
  location: locationSchema,
  message: z.string().max(2000).optional(),
  occurredAt: z.string().datetime(),
  media: mediaSchema.optional(),
});

/** @type {import("zod").ZodType<ReportAccidentInput>} */
const _reportAccidentSchemaTypecheck = reportAccidentSchema;
