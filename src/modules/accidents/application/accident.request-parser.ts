import type { AccidentMediaInput } from "../../../types/index.js";

type UploadedFile = {
  filename: string;
  mimetype?: string;
};

function parseJsonField(value: unknown, fallback: unknown): unknown {
  if (typeof value !== "string") {
    return value ?? fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildUploadedMedia(files: unknown): AccidentMediaInput[] {
  if (!Array.isArray(files)) {
    return [];
  }

  return (files as UploadedFile[]).map((file) => ({
    type: typeof file?.mimetype === "string" && file.mimetype.startsWith("video") ? "video" : "image",
    url: `/uploads/${file.filename}`,
  }));
}

export function parseAccidentReportRequest({
  body,
  files,
}: {
  body?: {
    location?: unknown;
    message?: unknown;
    occurredAt?: unknown;
    media?: unknown;
  };
  files?: unknown;
}): {
  location: unknown;
  message: unknown;
  occurredAt: unknown;
  media: AccidentMediaInput[];
} {
  const location = parseJsonField(body?.location, body?.location);
  const bodyMedia = parseJsonField(body?.media, []);
  const normalizedBodyMedia = Array.isArray(bodyMedia)
    ? (bodyMedia as AccidentMediaInput[])
    : [];
  const uploadedMedia = buildUploadedMedia(files);

  return {
    location,
    message: body?.message,
    occurredAt: body?.occurredAt,
    media: [...normalizedBodyMedia, ...uploadedMedia],
  };
}
