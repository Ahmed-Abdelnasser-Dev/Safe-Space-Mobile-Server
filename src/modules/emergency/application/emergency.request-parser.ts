function parseJsonField(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function parseEmergencyCreateRequest({
  body,
  file,
}: {
  body: {
    emergencyTypes?: unknown;
    emergencyServices?: unknown;
    description?: unknown;
    location?: unknown;
    timestamp?: unknown;
    photoUri?: unknown;
  };
  file?: { filename?: string } | null;
}): {
  emergencyTypes: unknown;
  emergencyServices: unknown;
  description: unknown;
  location: unknown;
  timestamp: unknown;
  photoUri: string | null;
} {
  const location = parseJsonField(body.location);
  const emergencyTypes = parseJsonField(body.emergencyTypes);
  const emergencyServices = parseJsonField(body.emergencyServices);
  const bodyPhotoUri = typeof body.photoUri === "string" ? body.photoUri : null;

  const photoUri = file?.filename
    ? `/uploads/${file.filename}`
    : bodyPhotoUri;

  return {
    emergencyTypes,
    emergencyServices,
    description: body.description,
    location,
    timestamp: body.timestamp,
    photoUri,
  };
}
