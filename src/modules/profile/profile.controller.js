import {
  updateMedicalInfoSchema,
  updateIdentificationSchema,
  updatePersonalInfoSchema,
} from "./profile.validators.js";

/**
 * @typedef {{
 *   getProfile: (userId: string) => Promise<unknown>,
 *   getMedicalInfo: (userId: string) => Promise<unknown>,
 *   updateMedicalInfo: (userId: string, data: unknown) => Promise<unknown>,
 *   getIdentification: (userId: string) => Promise<unknown>,
 *   updateIdentification: (userId: string, data: unknown) => Promise<unknown>,
 *   getPersonalInfo: (userId: string) => Promise<unknown>,
 *   updatePersonalInfo: (userId: string, data: unknown) => Promise<unknown>
 * }} ProfileService
 */

/**
 * Profile controller - handles HTTP requests/responses for profile operations
 * @param {{ profileService: ProfileService }} deps
 */
export function createProfileController({ profileService }) {
  return {
    /**
     * GET /me/profile - Get complete user profile
     */
    /** @type {import("express").RequestHandler} */
    getProfile: async (req, res, next) => {
      try {
        const userId = req.userId; // Set by requireAuth middleware
        const profile = await profileService.getProfile(userId);
        res.status(200).json(profile);
      } catch (err) {
        next(err);
      }
    },

    /**
     * GET /me/medical-info - Get medical information
     */
    /** @type {import("express").RequestHandler} */
    getMedicalInfo: async (req, res, next) => {
      try {
        const userId = req.userId;
        const medicalInfo = await profileService.getMedicalInfo(userId);
        res.status(200).json(medicalInfo);
      } catch (err) {
        next(err);
      }
    },

    /**
     * PUT /me/medical-info - Update medical information
     */
    /** @type {import("express").RequestHandler} */
    updateMedicalInfo: async (req, res, next) => {
      try {
        const userId = req.userId;
        const body = updateMedicalInfoSchema.parse(req.body);
        const updated = await profileService.updateMedicalInfo(userId, body);
        res.status(200).json(updated);
      } catch (err) {
        next(err);
      }
    },

    /**
     * GET /me/identification - Get identification data
     */
    /** @type {import("express").RequestHandler} */
    getIdentification: async (req, res, next) => {
      try {
        const userId = req.userId;
        const identification = await profileService.getIdentification(userId);
        res.status(200).json(identification);
      } catch (err) {
        next(err);
      }
    },

    /**
     * PUT /me/identification - Update identification data
     */
    /** @type {import("express").RequestHandler} */
    updateIdentification: async (req, res, next) => {
      try {
        const userId = req.userId;
        const body = updateIdentificationSchema.parse(req.body);
        const updated = await profileService.updateIdentification(userId, body);
        res.status(200).json(updated);
      } catch (err) {
        next(err);
      }
    },

    /**
     * GET /me/personal-info - Get personal information
     */
    /** @type {import("express").RequestHandler} */
    getPersonalInfo: async (req, res, next) => {
      try {
        const userId = req.userId;
        const personalInfo = await profileService.getPersonalInfo(userId);
        res.status(200).json(personalInfo);
      } catch (err) {
        next(err);
      }
    },

    /**
     * PATCH /me/personal-info - Update personal information
     */
    /** @type {import("express").RequestHandler} */
    updatePersonalInfo: async (req, res, next) => {
      try {
        const userId = req.userId;
        const body = updatePersonalInfoSchema.parse(req.body);
        const updated = await profileService.updatePersonalInfo(userId, body);
        res.status(200).json(updated);
      } catch (err) {
        next(err);
      }
    },
  };
}
