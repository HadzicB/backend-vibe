import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";

// The one place that lists every API. A new module = one new line here.
export const routes = Router();

routes.use("/", authRouter); // /login, /signup, /logout
routes.use("/users", usersRouter); // /users/me
