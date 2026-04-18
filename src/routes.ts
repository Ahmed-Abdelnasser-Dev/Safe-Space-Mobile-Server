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

type PrismaClientLike = ReturnType<typeof getPrisma>;
type AuthController = ReturnType<typeof createAuthController>;
type AuthService = Parameters<typeof createAuthController>[0]["authService"];
type NotificationsService = ReturnType<typeof createNotificationsService>;
type CentralUnitService = ReturnType<typeof createCentralUnitService>;
type AccidentsService = ReturnType<typeof createAccidentsService>;
type EmergencyService = ReturnType<typeof createEmergencyService>;
type NotificationsPrismaLike = Parameters<typeof createNotificationsService>[0]["prisma"];
type CentralUnitRepoPrismaLike = Parameters<typeof createCentralUnitRepo>[0];
type AccidentsRepoPrismaLike = Parameters<typeof createAccidentsRepo>[0];
type EmergencyRepoPrismaLike = Parameters<typeof createEmergencyRepo>[0];
type AuthRepoPrismaLike = Parameters<typeof createAuthRepo>[0];
type ProfileRepoPrismaLike = Parameters<typeof createProfileRepo>[0];
type AccidentsServiceCentralUnitDep = Parameters<typeof createAccidentsService>[0]["centralUnitService"];
type AccidentsServiceNotificationsDep = Parameters<typeof createAccidentsService>[0]["notificationsService"];
type EmergencyServiceNotificationsDep = Parameters<typeof createEmergencyService>[0]["notificationsService"];
type EmergencyServiceCentralUnitDep = Parameters<typeof createEmergencyService>[0]["centralUnitService"];
type AuthServiceRepoDep = Parameters<typeof createAuthService>[0]["authRepo"];

export type RoutesDeps = {
  prisma?: unknown;
  authController?: AuthController;
  authService?: AuthService;
  notificationsService?: NotificationsService;
  centralUnitService?: CentralUnitService;
  accidentsService?: AccidentsService;
  emergencyService?: EmergencyService;
};

export function createRoutes(deps: RoutesDeps = {}) {
  const router = Router();
  const prisma = (deps.prisma || getPrisma()) as PrismaClientLike;

  const notificationsService: NotificationsService =
    deps.notificationsService ||
    createNotificationsService({
      prisma: prisma as unknown as NotificationsPrismaLike,
    });

  const centralUnitService: CentralUnitService =
    deps.centralUnitService ||
    createCentralUnitService({
      centralUnitRepo: createCentralUnitRepo(
        prisma as unknown as CentralUnitRepoPrismaLike,
      ),
      notificationsService,
    });

  const accidentsService: AccidentsService =
    deps.accidentsService ||
    createAccidentsService({
      accidentsRepo: createAccidentsRepo(
        prisma as unknown as AccidentsRepoPrismaLike,
      ),
      centralUnitService:
        centralUnitService as unknown as AccidentsServiceCentralUnitDep,
      notificationsService:
        notificationsService as unknown as AccidentsServiceNotificationsDep,
    });

  const emergencyService: EmergencyService =
    deps.emergencyService ||
    createEmergencyService({
      emergencyRepo: createEmergencyRepo(
        prisma as unknown as EmergencyRepoPrismaLike,
      ),
      notificationsService:
        notificationsService as unknown as EmergencyServiceNotificationsDep,
      centralUnitService:
        centralUnitService as unknown as EmergencyServiceCentralUnitDep,
    });

  // Keep modules mounted at root to match required paths
  let authController: AuthController;
  if (deps.authController) {
    authController = deps.authController;
  } else if (deps.authService) {
    authController = createAuthController({ authService: deps.authService });
  } else {
    // Default runtime wiring
    const authService = createAuthService({
      authRepo: createAuthRepo(
        prisma as unknown as AuthRepoPrismaLike,
      ) as unknown as AuthServiceRepoDep,
    });
    authController = createAuthController({ authService });
  }
  router.use(createAuthRouter({ authController }));

  router.use(
    createAccidentsRouter({
      accidentsController: createAccidentsController({ accidentsService }),
    }),
  );
  router.use(
    createCentralUnitRouter({
      centralUnitController: createCentralUnitController({
        centralUnitService,
      }),
    }),
  );
  router.use(
    createNotificationsRouter({
      notificationsController: createNotificationsController({
        notificationsService,
      }),
    }),
  );

  // Profile endpoints
  const profileService = createProfileService({
    profileRepo: createProfileRepo(prisma as unknown as ProfileRepoPrismaLike),
  });
  router.use(
    createProfileRouter({
      profileController: createProfileController({ profileService }),
    }),
  );

  // Emergency endpoints
  router.use(
    createEmergencyRouter({
      emergencyController: createEmergencyController({ emergencyService }),
    }),
  );

  return router;
}
