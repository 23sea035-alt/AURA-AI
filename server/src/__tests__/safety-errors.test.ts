import { describe, it, expect } from "vitest";
import { AppError } from "../middleware/error-handler.js";

describe("AppError", () => {
  it("creates error with message and status code", () => {
    const err = new AppError("Forbidden", 403);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Forbidden");
    expect(err.statusCode).toBe(403);
  });

  it("defaults status to 400", () => {
    const err = new AppError("Bad request");
    expect(err.statusCode).toBe(400);
  });

  it("preserves stack trace", () => {
    const err = new AppError("Bad request", 400);
    expect(err.stack).toBeDefined();
  });
});
