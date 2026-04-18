import { 
  registerSchema, 
  loginSchema, 
  refreshSchema, 
  logoutSchema, 
  updateFcmTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema 
} from "./auth.validators.js";
import type { Request, RequestHandler } from "express";
import type { AppError } from "../../types/errors.js";

type AuthService = {
  register: (input: { email: string; password: string; fullName: string; phone?: string }) => Promise<unknown>;
  login: (input: {
    email: string;
    password: string;
    deviceId?: string;
    fcmToken?: string;
    ipAddress: string;
    userAgent: string;
  }) => Promise<unknown>;
  refresh: (input: { refreshToken: string }) => Promise<unknown>;
  logout: (input: { refreshToken: string }) => Promise<unknown>;
  updateFcmToken: (input: { userId: string; sessionId: string; fcmToken: string }) => Promise<unknown>;
  verifyEmail: (input: { token: string }) => Promise<unknown>;
  resendVerificationEmail: (input: { email: string }) => Promise<unknown>;
};

type AuthController = {
  register: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
  updateFcmToken: RequestHandler;
  verifyEmail: RequestHandler;
  resendVerificationEmail: RequestHandler;
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

export function createAuthController({ authService }: { authService: AuthService }): AuthController {
  return {
    register: async (req, res, next) => {
      try {
        const body = /** @type {{ email: string, password: string, fullName: string, phone?: string }} */ (registerSchema.parse(req.body));
        const result = await authService.register(body);
        return res.status(201).json(result);
      } catch (err) {
        return next(err);
      }
    },

    login: async (req, res, next) => {
      try {
        const body = /** @type {{ email: string, password: string, deviceId?: string, fcmToken?: string }} */ (loginSchema.parse(req.body));
        const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
        const userAgent = req.get("user-agent") || "unknown";
        
        const result = await authService.login({ 
          ...body, 
          ipAddress, 
          userAgent 
        });
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },

    refresh: async (req, res, next) => {
      try {
        const body = /** @type {{ refreshToken: string }} */ (refreshSchema.parse(req.body));
        const result = await authService.refresh(body);
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },

    logout: async (req, res, next) => {
      try {
        const body = /** @type {{ refreshToken: string }} */ (logoutSchema.parse(req.body));
        const result = await authService.logout(body);
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },

    updateFcmToken: async (req, res, next) => {
      try {
        const userId = requireUserId(req);
        const body = /** @type {{ sessionId: string, fcmToken: string }} */ (updateFcmTokenSchema.parse(req.body));
        const result = await authService.updateFcmToken({
          userId,
          ...body,
        });
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },

    verifyEmail: async (req, res, next) => {
      try {
        const body = /** @type {{ token: string }} */ (verifyEmailSchema.parse(req.body));
        const result = await authService.verifyEmail(body);
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },

    resendVerificationEmail: async (req, res, next) => {
      try {
        const body = /** @type {{ email: string }} */ (resendVerificationSchema.parse(req.body));
        const result = await authService.resendVerificationEmail(body);
        return res.status(200).json(result);
      } catch (err) {
        return next(err);
      }
    },
  };
}

