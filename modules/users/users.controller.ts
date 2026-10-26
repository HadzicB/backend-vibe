import type { Request, Response } from "express";
import { usersService } from "./users.service.js";

// Controller = HTTP only: read the request, call the service, write the response.
async function getCurrentUser(req: Request, res: Response) {
  const sessionId = (req.headers.authorization ?? "").replace("Bearer ", "");

  try {
    const user = await usersService.getUserBySession(sessionId);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

export const usersController = {
  getCurrentUser,
};
