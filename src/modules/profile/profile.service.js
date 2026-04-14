/**
 * Profile service - business logic for user profile operations
 * @typedef {import("../../types/errors").AppError} AppError
 * @typedef {{
 *   getMedicalInfo: (userId: string) => Promise<unknown>,
 *   updateMedicalInfo: (userId: string, data: import("../../types/index").UpdateMedicalInfoInput) => Promise<unknown>,
 *   getIdentification: (userId: string) => Promise<unknown>,
 *   updateIdentification: (userId: string, data: import("../../types/index").UpdateIdentificationInput) => Promise<unknown>,
 *   getPersonalInfo: (userId: string) => Promise<unknown>,
 *   updatePersonalInfo: (userId: string, data: import("../../types/index").UpdatePersonalInfoInput) => Promise<unknown>,
 *   getProfile: (userId: string) => Promise<unknown>
 * }} ProfileRepo
 * @param {{ profileRepo: ProfileRepo }} deps
 */
export function createProfileService({ profileRepo }) {
  
  /**
   * @param {number} statusCode
   * @param {string} code
   * @param {string} message
   * @returns {AppError}
   */
  function makeError(statusCode, code, message) {
    /** @type {AppError} */
    const err = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    err.expose = true;
    return err;
  }

  /**
   * @param {unknown} err
   * @returns {boolean}
   */
  function isPrismaNotFoundError(err) {
    return /** @type {AppError} */ (err)?.code === "P2025";
  }

  return {
    /**
     * Get user's medical information
     * @param {string} userId
     */
    async getMedicalInfo(userId) {
      const medicalInfo = await profileRepo.getMedicalInfo(userId);
      
      if (!medicalInfo) {
        throw makeError(404, "NOT_FOUND", "User not found");
      }
      
      return medicalInfo;
    },

    /**
     * Update user's medical information
     * @param {string} userId
     * @param {import("../../types/index").UpdateMedicalInfoInput} data
     */
    async updateMedicalInfo(userId, data) {
      try {
        const updated = await profileRepo.updateMedicalInfo(userId, data);
        return updated;
      } catch (err) {
        if (isPrismaNotFoundError(err)) {
          throw makeError(404, "NOT_FOUND", "User not found");
        }
        throw err;
      }
    },

    /**
     * Get user's identification data
      * @param {string} userId
     */
    async getIdentification(userId) {
      const identification = await profileRepo.getIdentification(userId);
      
      if (!identification) {
        throw makeError(404, "NOT_FOUND", "User not found");
      }
      
      return identification;
    },

    /**
     * Update user's identification data
     * @param {string} userId
     * @param {import("../../types/index").UpdateIdentificationInput} data
     */
    async updateIdentification(userId, data) {
      try {
        const updated = await profileRepo.updateIdentification(userId, data);
        return updated;
      } catch (err) {
        if (isPrismaNotFoundError(err)) {
          throw makeError(404, "NOT_FOUND", "User not found");
        }
        throw err;
      }
    },

    /**
     * Get user's personal information
      * @param {string} userId
     */
    async getPersonalInfo(userId) {
      const personalInfo = await profileRepo.getPersonalInfo(userId);
      
      if (!personalInfo) {
        throw makeError(404, "NOT_FOUND", "User not found");
      }
      
      return personalInfo;
    },

    /**
     * Update user's personal information
     * @param {string} userId
     * @param {import("../../types/index").UpdatePersonalInfoInput} data
     */
    async updatePersonalInfo(userId, data) {
      try {
        const updated = await profileRepo.updatePersonalInfo(userId, data);
        return updated;
      } catch (err) {
        if (isPrismaNotFoundError(err)) {
          throw makeError(404, "NOT_FOUND", "User not found");
        }
        throw err;
      }
    },

    /**
     * Get complete user profile
      * @param {string} userId
     */
    async getProfile(userId) {
      const profile = await profileRepo.getProfile(userId);
      
      if (!profile) {
        throw makeError(404, "NOT_FOUND", "User not found");
      }
      
      return profile;
    },
  };
}
