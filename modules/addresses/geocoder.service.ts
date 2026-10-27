// Third-party address search (geocoding): text in, candidate addresses with
// coordinates out. Uses Photon (OpenStreetMap data), which needs no API key and
// supports search-as-you-type. Fair use only: callers must debounce, and the
// query must be at least a few characters.
// Nothing else in the backend knows which provider is used.

const PHOTON_URL = "https://photon.komoot.io/api/";
// Identify the app to the provider. Add a contact (site or email) here if you deploy it.
const USER_AGENT = "backend-vibe/0.1 (learning project)";
const RESULT_LIMIT = 5;

// Thrown when the provider can't be reached or answers with an error
export class GeocoderUnavailableError extends Error {}

export type AddressCandidate = {
  displayName: string; // one readable line to show in the dropdown
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  region: string | null;
  country: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
};

// The parts of Photon's GeoJSON we read. Coordinates are [longitude, latitude].
type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    type?: string; // house, street, locality, district, city, county, state, country
    county?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    locality?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

function toCandidate(feature: PhotonFeature): AddressCandidate | null {
  const p = feature.properties;
  const coordinates = feature.geometry?.coordinates;
  if (!p || !coordinates) return null;

  const [longitude, latitude] = coordinates;
  // A street result carries its city in `city`. A city result IS the city: it has
  // no `city` field, only a `name`.
  const city =
    p.city ?? (p.type === "city" ? p.name : undefined) ?? p.district ?? p.locality;
  // We only store places we can put on a map and name a city and country for
  if (!city || !p.country) return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const region = p.state ?? p.county;

  const streetLine = p.street
    ? [p.street, p.housenumber].filter(Boolean).join(" ")
    : p.name !== city // for a city result the name IS the city, so don't say it twice
      ? p.name
      : undefined;
  const cityLine = [p.postcode, city].filter(Boolean).join(" ");
  // The same name exists in many countries (Oslo, Norway and Oslo, Minnesota), so
  // a result that is not a street also shows its region to tell them apart
  const regionLine = p.street ? undefined : region;
  const displayName = [streetLine, cityLine, regionLine, p.country]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(", ");

  return {
    displayName,
    street: p.street ?? null,
    houseNumber: p.housenumber ?? null,
    postalCode: p.postcode ?? null,
    city,
    region: region ?? null,
    country: p.country,
    countryCode: p.countrycode ?? null,
    latitude,
    longitude,
  };
}

async function searchAddresses(query: string): Promise<AddressCandidate[]> {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(RESULT_LIMIT));

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      // Don't let a slow provider hang our request
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new GeocoderUnavailableError("Geocoder unreachable");
  }
  if (!res.ok) {
    throw new GeocoderUnavailableError(`Geocoder answered ${res.status}`);
  }

  const data = (await res.json()) as { features?: PhotonFeature[] };
  // Photon can return the same place twice (e.g. a city and its municipality)
  const seen = new Set<string>();
  return (data.features ?? [])
    .map(toCandidate)
    .filter((c): c is AddressCandidate => c !== null)
    .filter((c) => !seen.has(c.displayName) && !!seen.add(c.displayName));
}

export const geocoderService = { searchAddresses };
