import { Router } from "express";
import { 
  authRateLimiter, 
  emailVerificationRateLimiter,
  refreshTokenRateLimiter 
} from "../../middleware/rateLimit.middleware.js";

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
 * @param {{ authController: AuthController }} deps
 */
export function createAuthRouter({ authController }) {
  const router = Router();
  
  // Auth endpoints with strict rate limiting
  router.post("/auth/register", authRateLimiter, authController.register);
  router.post("/auth/login", authRateLimiter, authController.login);
  
  // Token management with moderate rate limiting
  router.post("/auth/refresh-token", refreshTokenRateLimiter, authController.refresh);
  router.post("/auth/logout", authController.logout);
  router.post("/auth/update-fcm-token", authController.updateFcmToken);
  
  // Email verification with rate limiting
  router.post("/auth/verify-email", authController.verifyEmail);
  router.post("/auth/resend-verification", emailVerificationRateLimiter, authController.resendVerificationEmail);
  
  return router;
}

/** @type {AuthController} */
const unconfiguredAuthController = {
  register: (req, res) => res.status(500).json({ message: "Router not wired" }),
  login: (req, res) => res.status(500).json({ message: "Router not wired" }),
  refresh: (req, res) => res.status(500).json({ message: "Router not wired" }),
  logout: (req, res) => res.status(500).json({ message: "Router not wired" }),
  updateFcmToken: (req, res) => res.status(500).json({ message: "Router not wired" }),
  verifyEmail: (req, res) => res.status(500).json({ message: "Router not wired" }),
  resendVerificationEmail: (req, res) => res.status(500).json({ message: "Router not wired" })
};

export const authRouter = createAuthRouter({
  authController: unconfiguredAuthController,
});

