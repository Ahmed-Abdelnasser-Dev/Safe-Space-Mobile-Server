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

function buildUploadedMedia(files) {
  if (!Array.isArray(files)) {
    return [];
  }

  return files.map((file) => ({
    type: typeof file?.mimetype === "string" && file.mimetype.startsWith("video") ? "video" : "image",
    url: `/uploads/${file.filename}`,
  }));
}

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
