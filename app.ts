import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandling.js";
import { userAuthorized } from "./middleware/userAuthorized.js";
import { routes } from "./routes/index.js";

// Builds the app but does not listen, so tests can import it without a port.
export const app = express();

// Order matters: guard, body parsing, routes, 404, errors last.
app.use(userAuthorized);
// Parses JSON bodies into req.body. Malformed JSON goes to the error middleware.
app.use(express.json());
app.use(routes);
app.use(notFound);
app.use(errorHandler);
