import {
  addressesRepository,
  type AddressInput,
} from "./addresses.repository.js";
import { weatherService } from "../weather/weather.service.js";
import { geocoderService } from "./geocoder.service.js";

const MAX_ADDRESSES_PER_USER = 10;

// Service = business rules, no req/res and no SQL. It never picks HTTP
// statuses: it returns a result and the controller maps it to a status.

// Never trust the client: check the shape and the ranges again on the server
function validateAddress(raw: Record<string, unknown>) {
  const errors: Record<string, string[]> = {};

  const text = (field: string, max: number, required = false) => {
    const value = typeof raw[field] === "string" ? raw[field].trim() : "";
    if (!value && required) errors[field] = ["This field is required"];
    else if (value.length > max)
      errors[field] = [`Must be at most ${max} characters`];
    return value || null;
  };

  const label = text("label", 50);
  const displayName = text("displayName", 300);
  const street = text("street", 200);
  const houseNumber = text("houseNumber", 20);
  const postalCode = text("postalCode", 20);
  const city = text("city", 100, true);
  const region = text("region", 100);
  const country = text("country", 100, true);
  const countryCode = text("countryCode", 2)?.toUpperCase() ?? null;
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode))
    errors.countryCode = ["Must be a 2-letter code"];

  const { latitude, longitude } = raw;
  if (typeof latitude !== "number" || !(latitude >= -90 && latitude <= 90))
    errors.latitude = ["Must be a number between -90 and 90"];
  if (typeof longitude !== "number" || !(longitude >= -180 && longitude <= 180))
    errors.longitude = ["Must be a number between -180 and 180"];

  if (Object.keys(errors).length > 0) return { errors };

  const data: AddressInput = {
    label,
    displayName,
    street,
    houseNumber,
    postalCode,
    city: city as string,
    region,
    country: country as string,
    countryCode,
    latitude: latitude as number,
    longitude: longitude as number,
  };
  return { data };
}

async function createAddress(userId: number, raw: Record<string, unknown>) {
  const checked = validateAddress(raw);
  if (checked.errors) return { reason: "validation", errors: checked.errors };

  const count = await addressesRepository.countByUser(userId);
  if (count >= MAX_ADDRESSES_PER_USER) {
    return {
      reason: "limit",
      errors: {
        address: [`You can save at most ${MAX_ADDRESSES_PER_USER} addresses`],
      },
    };
  }

  const address = await addressesRepository.create(userId, checked.data);
  return { address };
}

// With includeWeather every address also gets `weather` (or null if the weather
// provider is down). One provider call covers all of the user's addresses.
async function listAddresses(userId: number, includeWeather = false) {
  const addresses = await addressesRepository.listByUser(userId);
  if (!includeWeather) return addresses;

  const weather = await weatherService.getCurrentWeather(addresses);
  return addresses.map((address, i) => ({ ...address, weather: weather[i] }));
}

// false = no such address for this user (it may exist for someone else)
async function deleteAddress(userId: number, id: number) {
  return addressesRepository.deleteOwned(id, userId);
}

// Throws GeocoderUnavailableError if the provider is down
async function searchAddresses(query: string) {
  return geocoderService.searchAddresses(query);
}

export const addressesService = {
  createAddress,
  listAddresses,
  deleteAddress,
  searchAddresses,
};
