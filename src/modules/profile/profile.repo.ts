import type { PrismaClient } from "@prisma/client";
import type {
  UpdateMedicalInfoInput,
  UpdateIdentificationInput,
  UpdatePersonalInfoInput,
} from "../../types/index.js";

type ProfileRepo = {
  getMedicalInfo: (userId: string) => Promise<unknown>;
  updateMedicalInfo: (userId: string, data: UpdateMedicalInfoInput) => Promise<unknown>;
  getIdentification: (userId: string) => Promise<unknown>;
  updateIdentification: (userId: string, data: UpdateIdentificationInput) => Promise<unknown>;
  getPersonalInfo: (userId: string) => Promise<unknown>;
  updatePersonalInfo: (userId: string, data: UpdatePersonalInfoInput) => Promise<unknown>;
  getProfile: (userId: string) => Promise<unknown>;
};

/**
 * Profile repository - handles database operations for user profile data
 */
export function createProfileRepo(prisma: PrismaClient): ProfileRepo {
  // Safe field selection - excludes passwordHash
  const safeUserSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    role: true,
    createdAt: true,
    updatedAt: true,
    
    // Personal Information
    displayName: true,
    profilePictureUrl: true,
    phoneNumber: true,
    country: true,
    city: true,
    address: true,
    
    // Medical Information
    bloodType: true,
    allergies: true,
    chronicConditions: true,
    currentMedications: true,
    disabilities: true,
    medicalNotes: true,
    heightCm: true,
    weightKg: true,
    smoker: true,
    lastUpdatedAt: true,
    
    // Identification Data
    fullLegalName: true,
    dateOfBirth: true,
    gender: true,
    nationality: true,
    nationalIdNumber: true,
    passportNumber: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    emergencyContactRelation: true,
    verifiedAt: true,
  };

  return {
    /**
     * Get user's medical information
     * @param {string} userId
     */
    async getMedicalInfo(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          bloodType: true,
          allergies: true,
          chronicConditions: true,
          currentMedications: true,
          disabilities: true,
          medicalNotes: true,
          heightCm: true,
          weightKg: true,
          smoker: true,
          lastUpdatedAt: true,
        },
      });
    },

    /**
     * Update user's medical information
      * @param {string} userId
      * @param {import("../../types/index.js").UpdateMedicalInfoInput} data
     */
    async updateMedicalInfo(userId, data) {
      return prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          lastUpdatedAt: new Date(),
        },
        select: {
          id: true,
          bloodType: true,
          allergies: true,
          chronicConditions: true,
          currentMedications: true,
          disabilities: true,
          medicalNotes: true,
          heightCm: true,
          weightKg: true,
          smoker: true,
          lastUpdatedAt: true,
        },
      });
    },

    /**
     * Get user's identification data
      * @param {string} userId
     */
    async getIdentification(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullLegalName: true,
          dateOfBirth: true,
          gender: true,
          nationality: true,
          nationalIdNumber: true,
          passportNumber: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
          verifiedAt: true,
        },
      });
    },

    /**
     * Update user's identification data
      * @param {string} userId
      * @param {import("../../types/index.js").UpdateIdentificationInput} data
     */
    async updateIdentification(userId, data) {
      return prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          fullLegalName: true,
          dateOfBirth: true,
          gender: true,
          nationality: true,
          nationalIdNumber: true,
          passportNumber: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
          verifiedAt: true,
        },
      });
    },

    /**
     * Get user's personal information
      * @param {string} userId
     */
    async getPersonalInfo(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          email: true,
          phoneNumber: true,
          country: true,
          city: true,
          address: true,
        },
      });
    },

    /**
     * Update user's personal information
      * @param {string} userId
      * @param {import("../../types/index.js").UpdatePersonalInfoInput} data
     */
    async updatePersonalInfo(userId, data) {
      return prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          displayName: true,
          profilePictureUrl: true,
          email: true,
          phoneNumber: true,
          country: true,
          city: true,
          address: true,
        },
      });
    },

    /**
     * Get complete user profile (all safe fields)
      * @param {string} userId
     */
    async getProfile(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: safeUserSelect,
      });
    },
  };
}
