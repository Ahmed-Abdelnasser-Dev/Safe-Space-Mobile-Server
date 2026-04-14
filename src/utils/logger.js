import pino from "pino";
import { APP_NAME } from "../config/constants.js";

/** @type {import("pino").LoggerOptions} */
const loggerOptions = {
  name: APP_NAME,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.refreshToken",
      "res.headers['set-cookie']",
    ],
    remove: true,
  },
};

export const logger = pino(loggerOptions);

