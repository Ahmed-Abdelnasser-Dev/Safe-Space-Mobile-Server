import {
  updateMedicalInfoSchema,
  updateIdentificationSchema,
  updatePersonalInfoSchema,
} from "./profile.validators.js";
import type { Request, RequestHandler } from "express";
import type { AppError } from "../../types/errors.js";
import type {
  UpdateMedicalInfoInput,
  UpdateIdentificationInput,
  UpdatePersonalInfoInput,
} from "../../types/index.js";

type ProfileService = {
  getProfile: (userId: string) => Promise<unknown>;
  getMedicalInfo: (userId: string) => Promise<unknown>;
  updateMedicalInfo: (userId: string, data: UpdateMedicalInfoInput) => Promise<unknown>;
  getIdentification: (userId: string) => Promise<unknown>;
  updateIdentification: (userId: string, data: UpdateIdentificationInput) => Promise<unknown>;
  getPersonalInfo: (userId: string) => Promise<unknown>;
  updatePersonalInfo: (userId: string, data: UpdatePersonalInfoInput) => Promise<unknown>;
};

type ProfileController = {
  getProfile: RequestHandler;
  getMedicalInfo: RequestHandler;
  updateMedicalInfo: RequestHandler;
  getIdentification: RequestHandler;
  updateIdentification: RequestHandler;
  getPersonalInfo: RequestHandler;
  updatePersonalInfo: RequestHandler;
};

function requireUserId(req: Request): string {
  if (!req.userId) {
    const err = new Error("Unauthorized") as AppError;
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    err.expose = true;
    throw err;
  }
  return req.userId;
}

/**
 * Profile controller - handles HTTP requests/responses for profile operations
 */
export function createProfileController({ profileService }: { profileService: ProfileService }): ProfileController {
  return {
    /**
     * GET /me/profile - Get complete user profile
     */
    getProfile: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const profile = await profileService.getProfile(userId);
        return res.status(200).json(profile);
      } catch (err) {
        return next(err);
      }
    },

    /**
     * GET /me/medical-info - Get medical information
     */
    getMedicalInfo: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const medicalInfo = await profileService.getMedicalInfo(userId);
        return res.status(200).json(medicalInfo);
      } catch (err) {
        return next(err);
      }
    },

    /**
     * PUT /me/medical-info - Update medical information
     */
    updateMedicalInfo: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const body = updateMedicalInfoSchema.parse(req.body);
        const updated = await profileService.updateMedicalInfo(userId, body);
        return res.status(200).json(updated);
      } catch (err) {
        return next(err);
      }
    },

    /**
     * GET /me/identification - Get identification data
     */
    getIdentification: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const identification = await profileService.getIdentification(userId);
        return res.status(200).json(identification);
      } catch (err) {
        return next(err);
      }
    },

    /**
     * PUT /me/identification - Update identification data
     */
    updateIdentification: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const body = updateIdentificationSchema.parse(req.body);
        const updated = await profileService.updateIdentification(userId, body);
        return res.status(200).json(updated);
      } catch (err) {
        return next(err);
      }
    },

    /**
     * GET /me/personal-info - Get personal information
     */
    getPersonalInfo: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const personalInfo = await profileService.getPersonalInfo(userId);
        return res.status(200).json(personalInfo);
      } catch (err) {
        return next(err);
      }
    },

    /**
     * PATCH /me/personal-info - Update personal information
     */
    updatePersonalInfo: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const body = updatePersonalInfoSchema.parse(req.body);
        const updated = await profileService.updatePersonalInfo(userId, body);
        return res.status(200).json(updated);
      } catch (err) {
        return next(err);
      }
    },
  };
}
