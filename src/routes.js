import { Router } from "express";

import { createAccidentsRouter } from "./modules/accidents/accidents.routes.js";
import { createCentralUnitRouter } from "./modules/centralUnit/centralUnit.routes.js";
import { createNotificationsRouter } from "./modules/notifications/notifications.routes.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createProfileRouter } from "./modules/profile/profile.routes.js";
import { createEmergencyRouter } from "./modules/emergency/emergency.routes.js";

import { getPrisma } from "./db/prisma.js";
import { createAccidentsRepo } from "./modules/accidents/accidents.repo.js";
import { createAccidentsService } from "./modules/accidents/accidents.service.js";
import { createAccidentsController } from "./modules/accidents/accidents.controller.js";
import { createCentralUnitRepo } from "./modules/centralUnit/centralUnit.repo.js";
import { createCentralUnitService } from "./modules/centralUnit/centralUnit.service.js";
import { createCentralUnitController } from "./modules/centralUnit/centralUnit.controller.js";
import { createNotificationsService } from "./modules/notifications/notifications.service.js";
import { createNotificationsController } from "./modules/notifications/notifications.controller.js";
import { createAuthRepo } from "./modules/auth/auth.repo.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createAuthController } from "./modules/auth/auth.controller.js";
import { createProfileRepo } from "./modules/profile/profile.repo.js";
import { createProfileService } from "./modules/profile/profile.service.js";
import { createProfileController } from "./modules/profile/profile.controller.js";
import { createEmergencyRepo } from "./modules/emergency/emergency.repo.js";
import { createEmergencyService } from "./modules/emergency/emergency.service.js";
import { createEmergencyController } from "./modules/emergency/emergency.controller.js";

/** @typedef {ReturnType<typeof getPrisma>} PrismaClientLike */

/**
 * @typedef {{
 *   register: import("express").RequestHandler,
 *   login: import("express").RequestHandler,
 *   refresh: import("express").RequestHandler,
 *   logout: import("express").RequestHandler,
 *   updateFcmToken: import("express").RequestHandler,
 *   verifyEmail: import("express").RequestHandler,
 *   resendVerificationEmail: import("express").RequestHandler
 * }} AuthController
 */

/**
 * @typedef {{
 *   register: (input: import("./types/index").AuthRegisterInput) => Promise<unknown>,
 *   login: (input: import("./types/index").AuthLoginInput & { ipAddress: string, userAgent: string }) => Promise<unknown>,
 *   refresh: (input: { refreshToken: string }) => Promise<unknown>,
 *   logout: (input: { refreshToken: string }) => Promise<unknown>,
 *   updateFcmToken: (input: { sessionId: string, fcmToken: string }) => Promise<unknown>,
 *   verifyEmail: (input: { token: string }) => Promise<unknown>,
 *   resendVerificationEmail: (input: { email: string }) => Promise<unknown>
 * }} AuthService
 */

/**
 * @typedef {{
 *   sendAccidentNotification: (input: import("./types/index").SendAccidentNotificationInput) => Promise<{ ok: true, sent: number, failed: number }>,
 *   notifyEmergencyServices?: (input: {
 *     emergencyRequestId: string,
 *     emergencyTypes: import("./types/index").EmergencyType[],
 *     emergencyServices: import("./types/index").EmergencyService[],
 *     location: import("./types/index").GeoLocation,
 *     description: string
 *   }) => Promise<unknown>
 * }} NotificationsService
 */

/**
 * @typedef {{
 *   sendAccidentToCentralUnit: (input: {
 *     accidentId: string,
 *     description: string,
 *     latitude: number,
 *     longitude: number,
 *     severity: "low" | "medium" | "high",
 *     media: import("./types/index").AccidentMediaInput[]
 *   }) => Promise<{ ok: true, centralUnitReferenceId: string } | { ok: false, reason: "not_configured" }>,
 *   receiveAccidentFromCentralUnit: (input: {
 *     centralUnitAccidentId: string,
 *     occurredAt: string,
 *     location: import("./types/index").GeoLocation
 *   }) => Promise<{ ok: true }>,
 *   sendEmergencyToCentralUnit?: (input: {
 *     emergencyRequestId: string,
 *     emergencyTypes: import("./types/index").EmergencyType[],
 *     emergencyServices: import("./types/index").EmergencyService[],
 *     description: string,
 *     latitude: number,
 *     longitude: number,
 *     timestamp: Date,
 *     photoUri: string | null,
 *     requesterUserId: string | null
 *   }) => Promise<unknown>
 * }} CentralUnitService
 */

/**
 * @typedef {{
 *   reportAccident: (input: {
 *     reporterUserId: string | null,
 *     location: import("./types/index").GeoLocation,
 *     message?: string,
 *     occurredAt: string,
 *     media: import("./types/index").AccidentMediaInput[]
 *   }) => Promise<{ accidentId: string, status: string }>
 * }} AccidentsService
 */

/**
 * @typedef {{
 *   createEmergencyRequest: (input: {
 *     requesterUserId: string | null,
 *     emergencyTypes: import("./types/index").EmergencyType[],
 *     emergencyServices: import("./types/index").EmergencyService[],
 *     description: string,
 *     photoUri: string | null,
 *     location: import("./types/index").GeoLocation,
 *     timestamp?: string
 *   }) => Promise<unknown>,
 *   getEmergencyRequest: (id: string) => Promise<unknown | null>,
 *   listEmergencyRequests: (options?: {
 *     status?: import("./types/index").EmergencyRequestStatus,
 *     limit?: number,
 *     offset?: number,
 *     userId?: string
 *   }) => Promise<{ data: unknown[], total: number, limit: number, offset: number }>,
 *   updateEmergencyRequestStatus: (id: string, status: string) => Promise<unknown>
 * }} EmergencyService
 */

/**
 * @typedef {{
 *   prisma?: PrismaClientLike,
 *   authController?: AuthController,
 *   authService?: AuthService,
 *   notificationsService?: NotificationsService,
 *   centralUnitService?: CentralUnitService,
 *   accidentsService?: AccidentsService,
 *   emergencyService?: EmergencyService
 * }} RoutesDeps
 */

/**
 * @param {RoutesDeps} [deps]
 * @returns {import("express").Router}
 */
export function createRoutes(deps = {}) {
  const router = Router();

  /** @type {PrismaClientLike} */
  const prisma = deps.prisma || getPrisma();

  /** @type {NotificationsService} */
  const notificationsService = deps.notificationsService || createNotificationsService({ prisma });

  /** @type {CentralUnitService} */
  const centralUnitService =
    deps.centralUnitService ||
    createCentralUnitService({
      centralUnitRepo: createCentralUnitRepo(prisma),
      notificationsService,
    });

  /** @type {AccidentsService} */
  const accidentsService =
    deps.accidentsService ||
    createAccidentsService({
      accidentsRepo: createAccidentsRepo(prisma),
      centralUnitService,
    });

  /** @type {EmergencyService} */
  const emergencyService =
    deps.emergencyService ||
    createEmergencyService({
      emergencyRepo: createEmergencyRepo(prisma),
      notificationsService,
      centralUnitService,
    });

  // Keep modules mounted at root to match required paths
  /** @type {AuthController} */
  let authController;
  if (deps.authController) {
    authController = deps.authController;
  } else if (deps.authService) {
    authController = createAuthController({ authService: deps.authService });
  } else {
    // Default runtime wiring
    const authService = createAuthService({ authRepo: createAuthRepo(prisma) });
    authController = createAuthController({ authService });
  }
  router.use(createAuthRouter({ authController }));

  router.use(
    createAccidentsRouter({
      accidentsController: createAccidentsController({ accidentsService }),
    })
  );
  router.use(
    createCentralUnitRouter({
      centralUnitController: createCentralUnitController({ centralUnitService }),
    })
  );
  router.use(
    createNotificationsRouter({
      notificationsController: createNotificationsController({
        notificationsService,
      }),
    })
  );

  // Profile endpoints
  const profileService = createProfileService({
    profileRepo: createProfileRepo(prisma),
  });
  router.use(
    createProfileRouter({
      profileController: createProfileController({ profileService }),
    })
  );

  // Emergency endpoints
  router.use(
    createEmergencyRouter({
      emergencyController: createEmergencyController({ emergencyService }),
    })
  );

  return router;
}

