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

export function createRoutes(deps = {}) {
  const router = Router();

  const prisma = deps.prisma || getPrisma();

  const notificationsService = deps.notificationsService || createNotificationsService({ prisma });

  const centralUnitService =
    deps.centralUnitService ||
    createCentralUnitService({
      centralUnitRepo: createCentralUnitRepo(prisma),
      accidentsRepo: createAccidentsRepo(prisma),
      notificationsService,
    });

  const accidentsService =
    deps.accidentsService ||
    createAccidentsService({
      accidentsRepo: createAccidentsRepo(prisma),
      centralUnitService,
    });

  const emergencyService =
    deps.emergencyService ||
    createEmergencyService({
      emergencyRepo: createEmergencyRepo(prisma),
      notificationsService,
      centralUnitService,
    });

  // Keep modules mounted at root to match required paths
  if (deps.authController) {
    router.use(createAuthRouter({ authController: deps.authController }));
  } else if (deps.authService) {
    router.use(createAuthRouter({ authController: createAuthController({ authService: deps.authService }) }));
  } else {
    // Default runtime wiring
    const authService = createAuthService({ authRepo: createAuthRepo(prisma) });
    router.use(createAuthRouter({ authController: createAuthController({ authService }) }));
  }
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

