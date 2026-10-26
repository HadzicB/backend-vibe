import type { NextFunction, Request, Response } from "express";
import { authService } from "../modules/auth/auth.service.js";

// Everything not listed here needs an active session (default deny).
const PUBLIC_ROUTES = ["POST /login", "POST /signup"];

// req.path has no query string: "/login?x=1" is still "/login"
export async function userAuthorized(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (PUBLIC_ROUTES.includes(`${req.method} ${req.path}`)) return next();
  const sessionId = req.headers.authorization?.replace("Bearer ", "");

  const isAuthorized = await authService.isSessionActive(sessionId);

  if (!isAuthorized) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
