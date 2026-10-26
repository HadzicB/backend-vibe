import { Router } from "express";
import { authController } from "./auth.controller.js";

// URL + method -> controller. No logic here.
export const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.post("/signup", authController.signup);
authRouter.post("/logout", authController.logout);
