import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";

// Ensure upload directory exists
/** @type {string} */
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  /**
   * @param {import("express").Request} req
   * @param {Express.Multer.File} file
   * @param {(error: Error | null, destination: string) => void} cb
   */
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  /**
   * @param {import("express").Request} req
   * @param {Express.Multer.File} file
   * @param {(error: Error | null, filename: string) => void} cb
   */
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * @param {import("express").Request} req
 * @param {Express.Multer.File} file
 * @param {(error: Error | null, acceptFile: boolean) => void} cb
 */
const fileFilter = (req, file, cb) => {
  // Accept images and videos
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only images and videos are allowed."),
      false,
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});
