import { z } from "zod";

/** @typedef {import("../../types/index.js").CreateEmergencyRequestInput} CreateEmergencyRequestInput */

/** @typedef {{ id: string }} EmergencyRequestParams */

/**
 * @typedef {{
 *   status?: "QUEUED" | "SENT" | "FAILED",
 *   limit?: number,
 *   offset?: number
 * }} EmergencyRequestListQuery
 */

/**
 * Location schema for geospatial coordinates validation
 * Ensures latitude and longitude are within valid ranges
 */
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Emergency type enumeration
 * Matches EmergencyType enum in Prisma schema
 */
export const EmergencyTypeEnum = z.enum([
  "CAR_ACCIDENT",
  "MEDICAL_EMERGENCY",
  "FIRE",
  "CRIME_VIOLENCE",
  "VEHICLE_BREAKDOWN",
  "OTHER",
]);

/**
 * Emergency service enumeration
 * Matches EmergencyService enum in Prisma schema
 */
export const EmergencyServiceEnum = z.enum([
  "POLICE",
  "AMBULANCE",
  "FIRE_DEPARTMENT",
  "ROADSIDE_ASSISTANCE",
]);

/**
 * Emergency request validation schema
 * Validates all required and optional fields for creating an emergency request
 */
export const createEmergencyRequestSchema = z
  .object({
    emergencyTypes: z.array(EmergencyTypeEnum).min(1, "At least one emergency type is required"),
    emergencyServices: z.array(EmergencyServiceEnum).min(1, "At least one emergency service is required"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(500, "Description cannot exceed 500 characters"),
    location: locationSchema,
    timestamp: z.string().datetime().optional(), // Auto-generated if not provided
  })
  .strict();

/**
 * Get emergency request by ID schema
 */
export const getEmergencyRequestSchema = z.object({
  id: z.string().uuid("Invalid emergency request ID"),
});

/**
 * List emergency requests query schema
 */
export const listEmergencyRequestsSchema = z
  .object({
    status: z.enum(["QUEUED", "SENT", "FAILED"]).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional();

/** @type {import("zod").ZodType<CreateEmergencyRequestInput>} */
const _createEmergencyRequestSchemaTypecheck = createEmergencyRequestSchema;

/** @type {import("zod").ZodType<EmergencyRequestParams>} */
const _getEmergencyRequestSchemaTypecheck = getEmergencyRequestSchema;

/** @type {import("zod").ZodType<EmergencyRequestListQuery | undefined>} */
const _listEmergencyRequestsSchemaTypecheck = listEmergencyRequestsSchema;
