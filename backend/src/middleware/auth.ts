import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth.js";
import { unauthorized } from "../lib/errors.js";

export interface AuthedRequest extends Request {
  userId: string;
  userEmail: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(unauthorized("Missing bearer token"));
  try {
    const payload = verifyAccessToken(header.slice(7));
    (req as AuthedRequest).userId = payload.sub;
    (req as AuthedRequest).userEmail = payload.email;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}
