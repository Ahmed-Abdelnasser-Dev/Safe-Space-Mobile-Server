function buildProfileRepo(overrides = {}) {
  return {
    getMedicalInfo: jest.fn(),
    updateMedicalInfo: jest.fn(),
    getIdentification: jest.fn(),
    updateIdentification: jest.fn(),
    getPersonalInfo: jest.fn(),
    updatePersonalInfo: jest.fn(),
    getProfile: jest.fn(),
    ...overrides,
  };
}

const updateCases = [
  {
    serviceMethod: "updateMedicalInfo",
    repoMethod: "updateMedicalInfo",
    data: { smoker: true },
  },
  {
    serviceMethod: "updateIdentification",
    repoMethod: "updateIdentification",
    data: { fullLegalName: "Test User" },
  },
  {
    serviceMethod: "updatePersonalInfo",
    repoMethod: "updatePersonalInfo",
    data: { displayName: "Tester" },
  },
];

for (const testCase of updateCases) {
  test(`${testCase.serviceMethod} maps Prisma P2025 to NOT_FOUND`, async () => {
    const { createProfileService } = await import(
      "../../src/modules/profile/profile.service.js"
    );

    const profileRepo = buildProfileRepo();
    profileRepo[testCase.repoMethod].mockRejectedValue({ code: "P2025" });

    const service = createProfileService({ profileRepo });

    await expect(
      service[testCase.serviceMethod]("user-1", testCase.data)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "User not found",
      expose: true,
    });
  });

  test(`${testCase.serviceMethod} rethrows non-P2025 errors unchanged`, async () => {
    const { createProfileService } = await import(
      "../../src/modules/profile/profile.service.js"
    );

    const profileRepo = buildProfileRepo();
    const thrown = "unexpected-error-value";
    profileRepo[testCase.repoMethod].mockRejectedValue(thrown);

    const service = createProfileService({ profileRepo });

    await expect(
      service[testCase.serviceMethod]("user-1", testCase.data)
    ).rejects.toBe(thrown);
  });
}
