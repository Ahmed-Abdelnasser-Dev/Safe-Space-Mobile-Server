/**
 * @param {unknown} value
 * @returns {unknown}
 */
function parseJsonField(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * @param {{
 *   body: {
 *     emergencyTypes?: unknown,
 *     emergencyServices?: unknown,
 *     description?: unknown,
 *     location?: unknown,
 *     timestamp?: unknown,
 *     photoUri?: unknown
 *   },
 *   file?: { filename?: string } | null
 * }} input
 * @returns {{
 *   emergencyTypes: unknown,
 *   emergencyServices: unknown,
 *   description: unknown,
 *   location: unknown,
 *   timestamp: unknown,
 *   photoUri: string | null
 * }}
 */
export function parseEmergencyCreateRequest({ body, file }) {
  const location = parseJsonField(body.location);
  const emergencyTypes = parseJsonField(body.emergencyTypes);
  const emergencyServices = parseJsonField(body.emergencyServices);

  const photoUri = file?.filename
    ? `/uploads/${file.filename}`
    : body.photoUri || null;

  return {
    emergencyTypes,
    emergencyServices,
    description: body.description,
    location,
    timestamp: body.timestamp,
    photoUri,
  };
}
