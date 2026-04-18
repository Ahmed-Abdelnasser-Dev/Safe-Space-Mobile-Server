import { Router } from "express";
import type { RequestHandler } from "express";
import { 
  authRateLimiter, 
  emailVerificationRateLimiter,
  refreshTokenRateLimiter,
  verifyEmailRateLimiter,
} from "../../middleware/rateLimit.middleware.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

type AuthController = {
  register: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
  updateFcmToken: RequestHandler;
  verifyEmail: RequestHandler;
  resendVerificationEmail: RequestHandler;
};

export function createAuthRouter({ authController }: { authController: AuthController }) {
  const router = Router();
  
  // Auth endpoints with strict rate limiting
  router.post("/auth/register", authRateLimiter, authController.register);
  router.post("/auth/login", authRateLimiter, authController.login);
  
  // Token management with moderate rate limiting
  router.post("/auth/refresh-token", refreshTokenRateLimiter, authController.refresh);
  router.post("/auth/logout", authController.logout);
  router.post("/auth/update-fcm-token", requireAuth, authController.updateFcmToken);
  
  // Email verification with rate limiting
  router.post("/auth/verify-email", verifyEmailRateLimiter, authController.verifyEmail);
  router.post("/auth/resend-verification", emailVerificationRateLimiter, authController.resendVerificationEmail);
  
  return router;
}

const notWiredHandler: RequestHandler = (_req, res) =>
  res.status(500).json({ message: "Router not wired" });

const unconfiguredAuthController: AuthController = {
  register: notWiredHandler,
  login: notWiredHandler,
  refresh: notWiredHandler,
  logout: notWiredHandler,
  updateFcmToken: notWiredHandler,
  verifyEmail: notWiredHandler,
  resendVerificationEmail: notWiredHandler,
};

export const authRouter = createAuthRouter({
  authController: unconfiguredAuthController,
});

