import { Router } from "express";
import { usersController } from "./users.controller.js";

// Mounted under /users in routes/index.ts, so "/me" here is GET /users/me.
export const usersRouter = Router();

usersRouter.get("/me", usersController.getCurrentUser);
