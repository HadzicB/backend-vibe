import { Router } from "express";
import { addressesController } from "./addresses.controller.js";

// Mounted under /addresses in routes/index.ts.
export const addressesRouter = Router();

addressesRouter.get("/search", addressesController.search);
addressesRouter.get("/", addressesController.list);
addressesRouter.post("/", addressesController.create);
addressesRouter.delete("/:id", addressesController.remove);
