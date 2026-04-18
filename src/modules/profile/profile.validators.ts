import { z } from "zod";

/**
 * Schema for updating medical information
 */
export const updateMedicalInfoSchema = z.object({
  bloodType: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  allergies: z.array(z.string().max(200)).max(50).optional(),
  chronicConditions: z.array(z.string().max(200)).max(50).optional(),
  currentMedications: z.array(z.string().max(200)).max(100).optional(),
  disabilities: z.array(z.string().max(200)).max(30).optional(),
  medicalNotes: z.string().max(5000).optional(),
  heightCm: z.number().min(30).max(300).optional(),
  weightKg: z.number().min(2).max(500).optional(),
  smoker: z.boolean().optional(),
}).strict();

/**
 * Schema for updating identification data
 */
export const updateIdentificationSchema = z.object({
  fullLegalName: z.string().min(1).max(200).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(["male", "female"]).optional(),
  nationality: z.string().max(100).optional(),
  nationalIdNumber: z.string().max(100).optional(),
  passportNumber: z.string().max(100).optional(),
  emergencyContactName: z.string().min(1).max(200).optional(),
  emergencyContactPhone: z.string().min(5).max(50).optional(),
  emergencyContactRelation: z.string().max(100).optional(),
}).strict();

/**
 * Schema for updating personal information
 */
export const updatePersonalInfoSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  profilePictureUrl: z.string().url().max(500).optional(),
  email: z.string().email().max(255).optional(),
  phoneNumber: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
}).strict();
