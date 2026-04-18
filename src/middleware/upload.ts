import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { FileFilterCallback } from "multer";

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_TO_EXTENSION));

// Ensure upload directory exists
/** @type {string} */
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ): void => {
    cb(null, uploadDir);
  },
  filename: (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ): void => {
    const ext = MIME_TO_EXTENSION[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const mimeType = file.mimetype.toLowerCase();
  const extension = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    cb(new Error("Invalid file type. Only images and videos are allowed."));
    return;
  }

  const expectedExtension = MIME_TO_EXTENSION[mimeType];
  if (expectedExtension && extension !== expectedExtension) {
    cb(new Error("File extension does not match the detected file type."));
    return;
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
    files: 10,
  },
});
