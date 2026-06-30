import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { sendError } from "../lib/response.js";

export function validate(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join("; ");
      sendError(res, message, 400, "VALIDATION_ERROR");
      return;
    }
    req.body = result.data;
    next();
  };
}
