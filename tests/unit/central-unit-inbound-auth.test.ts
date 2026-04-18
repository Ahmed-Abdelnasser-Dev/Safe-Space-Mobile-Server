const CENTRAL_UNIT_ENV_KEYS = [
  "DATABASE_URL",
  "CENTRAL_UNIT_INBOUND_AUTH_MODE",
  "CENTRAL_UNIT_PROXY_VERIFIED_HEADER",
  "CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN",
];

let centralUnitEnvSnapshot = {};

beforeAll(() => {
  centralUnitEnvSnapshot = Object.fromEntries(
    CENTRAL_UNIT_ENV_KEYS.map((key) => [key, process.env[key]])
  );
});

beforeEach(() => {
  process.env.DATABASE_URL =
    "postgresql://user:pass@localhost:5432/db?schema=public";
  delete process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE;
  delete process.env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER;
  delete process.env.CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN;
});

afterAll(() => {
  for (const key of CENTRAL_UNIT_ENV_KEYS) {
    if (typeof centralUnitEnvSnapshot[key] === "undefined") {
      delete process.env[key];
      continue;
    }
    process.env[key] = centralUnitEnvSnapshot[key];
  }
});

test("enforceCentralUnitInboundAuth allows proxy mode with verified header", async () => {
  const { enforceCentralUnitInboundAuth } = await import(
    "../../src/modules/centralUnit/centralUnit.inboundAuth.js"
  );

  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "proxy";
  process.env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER = "x-client-cert-verified";

  const req = {
    headers: { "x-client-cert-verified": "true" },
    socket: {},
  };

  expect(() => enforceCentralUnitInboundAuth(req)).not.toThrow();
});

test("enforceCentralUnitInboundAuth rejects proxy mode when custom verified header is missing", async () => {
  const { enforceCentralUnitInboundAuth } = await import(
    "../../src/modules/centralUnit/centralUnit.inboundAuth.js"
  );

  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "proxy";
  process.env.CENTRAL_UNIT_PROXY_VERIFIED_HEADER = "x-custom-proxy-verified";

  const req = {
    headers: { "x-client-cert-verified": "true" },
    socket: {},
  };

  expect(() => enforceCentralUnitInboundAuth(req)).toThrow("Central Unit auth failed");
});

test("enforceCentralUnitInboundAuth bypasses checks in off mode", async () => {
  const { enforceCentralUnitInboundAuth } = await import(
    "../../src/modules/centralUnit/centralUnit.inboundAuth.js"
  );

  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "off";

  const req = {
    headers: {},
    socket: {},
  };

  expect(() => enforceCentralUnitInboundAuth(req)).not.toThrow();
});

test("enforceCentralUnitInboundAuth rejects mtls mode when socket is not authorized", async () => {
  const { enforceCentralUnitInboundAuth } = await import(
    "../../src/modules/centralUnit/centralUnit.inboundAuth.js"
  );

  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "mtls";

  const req = {
    headers: {},
    socket: {
      authorized: false,
      getPeerCertificate: () => ({ subject: { CN: "trusted-cn" } }),
    },
  };

  expect(() => enforceCentralUnitInboundAuth(req)).toThrow("Central Unit mTLS required");
});

test("enforceCentralUnitInboundAuth rejects mtls mode when certificate CN mismatches allowlist", async () => {
  const { enforceCentralUnitInboundAuth } = await import(
    "../../src/modules/centralUnit/centralUnit.inboundAuth.js"
  );

  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "mtls";
  process.env.CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN = "trusted-cn";

  const req = {
    headers: {},
    socket: {
      authorized: true,
      getPeerCertificate: () => ({ subject: { CN: "wrong-cn" } }),
    },
  };

  expect(() => enforceCentralUnitInboundAuth(req)).toThrow("Central Unit client cert not allowed");
});

test("enforceCentralUnitInboundAuth allows mtls mode with matching certificate CN", async () => {
  const { enforceCentralUnitInboundAuth } = await import(
    "../../src/modules/centralUnit/centralUnit.inboundAuth.js"
  );

  process.env.CENTRAL_UNIT_INBOUND_AUTH_MODE = "mtls";
  process.env.CENTRAL_UNIT_MTLS_ALLOWED_SUBJECT_CN = "trusted-cn";

  const req = {
    headers: {},
    socket: {
      authorized: true,
      getPeerCertificate: () => ({ subject: { CN: "trusted-cn" } }),
    },
  };

  expect(() => enforceCentralUnitInboundAuth(req)).not.toThrow();
});
