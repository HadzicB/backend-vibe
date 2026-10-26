import type { ErrorRequestHandler, RequestHandler } from "express";

// Nothing matched the URL
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Not found" });
};

// One error middleware (4 arguments). Express 5 also sends rejected async handlers here.
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  console.log(error);
  res.status(500).json({ message: "Something went wrong" });
};
