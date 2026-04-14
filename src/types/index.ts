export type UserRole = "ADMIN" | "USER";

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface AuthRegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthLoginInput {
  email: string;
  password: string;
  deviceId?: string;
  fcmToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export type EmergencyType =
  | "CAR_ACCIDENT"
  | "MEDICAL_EMERGENCY"
  | "FIRE"
  | "CRIME_VIOLENCE"
  | "VEHICLE_BREAKDOWN"
  | "OTHER";

export type EmergencyService =
  | "POLICE"
  | "AMBULANCE"
  | "FIRE_DEPARTMENT"
  | "ROADSIDE_ASSISTANCE";

export type EmergencyRequestStatus = "QUEUED" | "SENT" | "FAILED";

export interface CreateEmergencyRequestInput {
  emergencyTypes: EmergencyType[];
  emergencyServices: EmergencyService[];
  description: string;
  location: GeoLocation;
  timestamp?: string;
}

export type NotificationDataValue = string | number | boolean | null;

export interface SendAccidentNotificationInput {
  accidentId: string;
  userIds: string[];
  title: string;
  body: string;
  streetName?: string;
  data?: Record<string, NotificationDataValue>;
}

export interface AccidentMediaInput {
  type: "image" | "video";
  url: string;
}

export interface ReportAccidentInput {
  location: GeoLocation;
  message?: string;
  occurredAt: string;
  media?: AccidentMediaInput[];
}

export interface UpdateMedicalInfoInput {
  bloodType?: "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  disabilities?: string[];
  medicalNotes?: string;
  heightCm?: number;
  weightKg?: number;
  smoker?: boolean;
}

export interface UpdateIdentificationInput {
  fullLegalName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  nationality?: string;
  nationalIdNumber?: string;
  passportNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface UpdatePersonalInfoInput {
  displayName?: string;
  profilePictureUrl?: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  address?: string;
}
