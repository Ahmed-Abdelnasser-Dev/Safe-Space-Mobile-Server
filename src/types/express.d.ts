import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    userRole?: "ADMIN" | "USER";
    requestId?: string;
    file?: Express.Multer.File;
    files?:
      | Express.Multer.File[]
      | { [fieldname: string]: Express.Multer.File[] };
  }
}
