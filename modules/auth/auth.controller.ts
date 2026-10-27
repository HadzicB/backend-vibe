import type { Request, Response } from "express";
import { authService } from "./auth.service.js";

// Controller = HTTP only: read the request, call the service, write the response.
// express.json() (in server.ts) already parsed the body into req.body and
// rejected malformed JSON. It stays undefined when the body is empty.

async function signup(req: Request, res: Response) {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  console.log({ method: req.method, url: req.url, body });

  try {
    const result = await authService.signup(body.email, body.password);
    if (result.reason === "validation")
      return res.status(400).json({ errors: result.errors });
    if (result.reason === "duplicate")
      return res.status(409).json({ errors: result.errors });
    res.status(201).json({
      message: "Account created",
      user: result.user,
      session: result.session,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

async function login(req: Request, res: Response) {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  console.log({
    method: req.method,
    url: req.url,
    ip: req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    language: req.headers["accept-language"],
    body,
  });

  try {
    const result = await authService.login(body.email, body.password);
    if (!result) {
      return res.status(401).json({ message: "Wrong email or password" });
    }
    res.status(200).json({ message: "Logged in", ...result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

async function logout(req: Request, res: Response) {
  // Frontend part sends it as "Authorization: Bearer <id>".
  const sessionId = (req.headers.authorization ?? "").replace("Bearer ", "");

  try {
    await authService.logout(sessionId);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }

  res.status(200).json({ message: "Logged out" });
}

export const authController = {
  signup,
  login,
  logout,
};
