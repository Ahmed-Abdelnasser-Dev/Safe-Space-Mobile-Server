/**
 * @typedef {{ filename: string, mimetype?: string }} UploadedFile
 */

/**
 * @param {unknown} value
 * @param {unknown} fallback
 * @returns {unknown}
 */
function parseJsonField(value, fallback) {
  if (typeof value !== "string") {
    return value ?? fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * @param {unknown} files
 * @returns {import("../../../types/index").AccidentMediaInput[]}
 */
function buildUploadedMedia(files) {
  if (!Array.isArray(files)) {
    return [];
  }

  return /** @type {UploadedFile[]} */ (files).map((file) => ({
    type: typeof file?.mimetype === "string" && file.mimetype.startsWith("video") ? "video" : "image",
    url: `/uploads/${file.filename}`,
  }));
}

/**
 * @param {{
 *   body?: {
 *     location?: unknown,
 *     message?: unknown,
 *     occurredAt?: unknown,
 *     media?: unknown
 *   },
 *   files?: unknown
 * }} input
 * @returns {{
 *   location: unknown,
 *   message: unknown,
 *   occurredAt: unknown,
 *   media: import("../../../types/index").AccidentMediaInput[]
 * }}
 */
export function parseAccidentReportRequest({ body, files }) {
  const location = parseJsonField(body?.location, body?.location);
  const bodyMedia = parseJsonField(body?.media, []);
  const normalizedBodyMedia = Array.isArray(bodyMedia) ? bodyMedia : [];
  const uploadedMedia = buildUploadedMedia(files);

  return {
    location,
    message: body?.message,
    occurredAt: body?.occurredAt,
    media: [...normalizedBodyMedia, ...uploadedMedia],
  };
}
