import { 
  registerSchema, 
  loginSchema, 
  refreshSchema, 
  logoutSchema, 
  updateFcmTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema 
} from "./auth.validators.js";

/**
 * @typedef {{
 *   register: (input: { email: string, password: string, fullName: string, phone?: string }) => Promise<unknown>,
 *   login: (input: { email: string, password: string, deviceId?: string, fcmToken?: string, ipAddress: string, userAgent: string }) => Promise<unknown>,
 *   refresh: (input: { refreshToken: string }) => Promise<unknown>,
 *   logout: (input: { refreshToken: string }) => Promise<unknown>,
 *   updateFcmToken: (input: { sessionId: string, fcmToken: string }) => Promise<unknown>,
 *   verifyEmail: (input: { token: string }) => Promise<unknown>,
 *   resendVerificationEmail: (input: { email: string }) => Promise<unknown>
 * }} AuthService
 */

/**
 * @param {{ authService: AuthService }} deps
 */
export function createAuthController({ authService }) {
  return {
    /** @type {import("express").RequestHandler} */
    register: async (req, res, next) => {
      try {
        const body = registerSchema.parse(req.body);
        const result = await authService.register(body);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    login: async (req, res, next) => {
      try {
        const body = loginSchema.parse(req.body);
        const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
        const userAgent = req.get("user-agent") || "unknown";
        
        const result = await authService.login({ 
          ...body, 
          ipAddress, 
          userAgent 
        });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    refresh: async (req, res, next) => {
      try {
        const body = refreshSchema.parse(req.body);
        const result = await authService.refresh(body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    logout: async (req, res, next) => {
      try {
        const body = logoutSchema.parse(req.body);
        const result = await authService.logout(body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    updateFcmToken: async (req, res, next) => {
      try {
        const body = updateFcmTokenSchema.parse(req.body);
        const result = await authService.updateFcmToken(body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    verifyEmail: async (req, res, next) => {
      try {
        const body = verifyEmailSchema.parse(req.body);
        const result = await authService.verifyEmail(body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    /** @type {import("express").RequestHandler} */
    resendVerificationEmail: async (req, res, next) => {
      try {
        const body = resendVerificationSchema.parse(req.body);
        const result = await authService.resendVerificationEmail(body);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}

