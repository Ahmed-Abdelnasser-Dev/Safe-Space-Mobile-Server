import { z } from "zod";

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

export const sendAccidentSchema = z
  .object({
    accidentId: z.string().uuid(),
    description: z.string().min(1).max(5000),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    severity: z.enum(["low", "medium", "high"]),
    media: z
      .array(
        z.object({
          type: z.enum(["image", "video"]),
          url: z.string().url(),
        })
      )
      .default([]),
  })
  .strict();

export const receiveAccidentSchema = z
  .object({
    centralUnitAccidentId: z.string().min(1),
    occurredAt: z.string().datetime(),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
  })
  .strict();

/** @type {import("zod").ZodType<SendAccidentToCentralUnitInput>} */
const _sendAccidentSchemaTypecheck = sendAccidentSchema;

/** @type {import("zod").ZodType<ReceiveAccidentFromCentralUnitInput>} */
const _receiveAccidentSchemaTypecheck = receiveAccidentSchema;

