test("parseAccidentReportRequest parses multipart JSON fields and uploaded files", async () => {
  const { parseAccidentReportRequest } = await import(
    "../../src/modules/accidents/application/accident.request-parser.js"
  );

  const parsed = parseAccidentReportRequest({
    body: {
      location: '{"lat":30.0444,"lng":31.2357}',
      message: "Road crash",
      occurredAt: "2026-01-29T12:34:56.000Z",
      media: '[{"type":"image","url":"/uploads/from-body.jpg"}]',
    },
    files: [
      {
        filename: "upload-1.jpg",
        mimetype: "image/jpeg",
      },
      {
        filename: "upload-2.mp4",
        mimetype: "video/mp4",
      },
    ],
  });

  expect(parsed).toEqual({
    location: { lat: 30.0444, lng: 31.2357 },
    message: "Road crash",
    occurredAt: "2026-01-29T12:34:56.000Z",
    media: [
      { type: "image", url: "/uploads/from-body.jpg" },
      { type: "image", url: "/uploads/upload-1.jpg" },
      { type: "video", url: "/uploads/upload-2.mp4" },
    ],
  });
});

test("parseAccidentReportRequest tolerates invalid body media JSON", async () => {
  const { parseAccidentReportRequest } = await import(
    "../../src/modules/accidents/application/accident.request-parser.js"
  );

  const parsed = parseAccidentReportRequest({
    body: {
      location: { lat: 30, lng: 31 },
      message: "Road crash",
      occurredAt: "2026-01-29T12:34:56.000Z",
      media: "not-json",
    },
    files: null,
  });

  expect(parsed.media).toEqual([]);
  expect(parsed.location).toEqual({ lat: 30, lng: 31 });
});

test("parseAccidentReportRequest keeps invalid location string for validator rejection", async () => {
  const { parseAccidentReportRequest } = await import(
    "../../src/modules/accidents/application/accident.request-parser.js"
  );

  const parsed = parseAccidentReportRequest({
    body: {
      location: "not-json",
      occurredAt: "2026-01-29T12:34:56.000Z",
      media: [],
    },
    files: [],
  });

  expect(parsed.location).toBe("not-json");
});

test("parseAccidentReportRequest ignores parsed non-array media payload", async () => {
  const { parseAccidentReportRequest } = await import(
    "../../src/modules/accidents/application/accident.request-parser.js"
  );

  const parsed = parseAccidentReportRequest({
    body: {
      location: { lat: 30, lng: 31 },
      occurredAt: "2026-01-29T12:34:56.000Z",
      media: '{"type":"image"}',
    },
    files: [
      {
        filename: "no-mimetype.bin",
      },
    ],
  });

  expect(parsed.media).toEqual([{ type: "image", url: "/uploads/no-mimetype.bin" }]);
});
