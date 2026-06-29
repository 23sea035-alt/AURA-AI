import { Request, Response, NextFunction } from "express";
import { sendError } from "../lib/response.js";
import { logger } from "../lib/logger.js";
import { captureException } from "../lib/observability.js";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code);
    return;
  }

  logger.error({ err }, "Unhandled error");
  captureException(err);
  sendError(res, "Internal server error", 500);
}
