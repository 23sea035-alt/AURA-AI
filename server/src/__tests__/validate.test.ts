import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";

function mockReqRes(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("validate middleware", () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.number().min(18, "Must be 18+"),
  });

  it("calls next() when body is valid", () => {
    const { req, res, next } = mockReqRes({ name: "Alex", age: 25 });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing field)", () => {
    const { req, res, next } = mockReqRes({ name: "Alex" });
    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when body is invalid (wrong type)", () => {
    const { req, res, next } = mockReqRes({ name: "Alex", age: "twenty" });
    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("sets req.body to parsed data on success", () => {
    const { req, res, next } = mockReqRes({ name: "Alex", age: 25 });
    validate(schema)(req, res, next);

    expect(req.body).toEqual({ name: "Alex", age: 25 });
  });

  it("strips unknown fields from req.body", () => {
    const { req, res, next } = mockReqRes({ name: "Alex", age: 25, extra: "stripped" });
    validate(schema)(req, res, next);

    expect(req.body).toEqual({ name: "Alex", age: 25 });
    expect(req.body).not.toHaveProperty("extra");
  });
});
