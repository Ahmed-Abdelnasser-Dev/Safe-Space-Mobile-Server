test("parseEmergencyCreateRequest parses JSON multipart fields and upload photo", async () => {
  const { parseEmergencyCreateRequest } = await import(
    "../../src/modules/emergency/application/emergency.request-parser.js"
  );

  const parsed = parseEmergencyCreateRequest({
    body: {
      emergencyTypes: '["FIRE"]',
      emergencyServices: '["FIRE_DEPARTMENT"]',
      description: "Fire at apartment",
      location: '{"lat":30.1,"lng":31.2}',
      timestamp: "2026-01-29T12:34:56.000Z",
      photoUri: "/uploads/old-photo.jpg",
    },
    file: {
      filename: "new-photo.jpg",
    },
  });

  expect(parsed).toEqual({
    emergencyTypes: ["FIRE"],
    emergencyServices: ["FIRE_DEPARTMENT"],
    description: "Fire at apartment",
    location: { lat: 30.1, lng: 31.2 },
    timestamp: "2026-01-29T12:34:56.000Z",
    photoUri: "/uploads/new-photo.jpg",
  });
});

test("parseEmergencyCreateRequest keeps invalid JSON for validator handling", async () => {
  const { parseEmergencyCreateRequest } = await import(
    "../../src/modules/emergency/application/emergency.request-parser.js"
  );

  const parsed = parseEmergencyCreateRequest({
    body: {
      emergencyTypes: "not-json",
      emergencyServices: '["AMBULANCE"]',
      description: "Need help",
      location: "bad-json",
    },
    file: null,
  });

  expect(parsed.emergencyTypes).toBe("not-json");
  expect(parsed.location).toBe("bad-json");
  expect(parsed.photoUri).toBeNull();
});
