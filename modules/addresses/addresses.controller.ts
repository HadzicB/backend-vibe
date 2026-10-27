import type { Request, Response } from "express";
import { addressesService } from "./addresses.service.js";
import { GeocoderUnavailableError } from "./geocoder.service.js";

// Controller = HTTP only: read the request, call the service, write the response.
// The guard already checked the session and put the caller's id on res.locals.

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 100;

async function search(req: Request, res: Response) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < MIN_QUERY_LENGTH || q.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({
      message: `Query must be ${MIN_QUERY_LENGTH} to ${MAX_QUERY_LENGTH} characters`,
    });
  }

  try {
    const results = await addressesService.searchAddresses(q);
    res.status(200).json({ results });
  } catch (error) {
    console.log(error);
    if (error instanceof GeocoderUnavailableError) {
      // The problem is the provider behind us, not the request
      return res.status(502).json({ message: "Address search is unavailable" });
    }
    res.status(500).json({ message: "Something went wrong" });
  }
}

// GET /addresses            the user's addresses
// GET /addresses?include=weather   the same, each with its current weather
async function list(req: Request, res: Response) {
  const userId = res.locals.userId as number;
  const includeWeather = req.query.include === "weather";
  try {
    const addresses = await addressesService.listAddresses(
      userId,
      includeWeather,
    );
    res.status(200).json({ addresses });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

async function create(req: Request, res: Response) {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  const userId = res.locals.userId as number;
  try {
    const result = await addressesService.createAddress(userId, body);
    if (result.reason === "validation")
      return res.status(400).json({ errors: result.errors });
    if (result.reason === "limit")
      return res.status(409).json({ errors: result.errors });
    res.status(201).json({ address: result.address });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const userId = res.locals.userId as number;
  try {
    const deleted = await addressesService.deleteAddress(userId, id);
    // Someone else's address looks exactly like a missing one
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

export const addressesController = {
  search,
  list,
  create,
  remove,
};
