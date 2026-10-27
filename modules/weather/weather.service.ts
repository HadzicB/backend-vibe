// Third-party weather (Open-Meteo): coordinates in, current conditions out.
// No API key. Nothing else in the backend knows which provider is used.
// Failures never throw: weather is a nice-to-have, so a caller gets null for
// the places it could not get, and the rest of the page still works.

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 10 * 60 * 1000; // "current" data only changes every ~15 min
const MAX_CACHE_ENTRIES = 500;

export type CurrentWeather = {
  temperature: number; // degrees Celsius
  weatherCode: number; // WMO code: 0 clear, 61 rain, 95 thunderstorm, ...
  isDay: boolean;
  windSpeed: number; // km/h
  observedAt: string; // when the provider measured it (UTC)
};

type Point = { latitude: number; longitude: number };

// What we read from Open-Meteo. One location comes back as an object, several as an array.
type OpenMeteoResult = {
  current?: {
    time: string;
    temperature_2m: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
};

const cache = new Map<string, { weather: CurrentWeather; expiresAt: number }>();

// 2 decimals is about 1 km, finer than the weather model's grid, so the forecast
// is the same. It also means we never send a user's exact home coordinates
// to a third party, and nearby addresses share one cache entry.
function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function cacheKey(point: Point) {
  return `${roundCoordinate(point.latitude)},${roundCoordinate(point.longitude)}`;
}

function remember(key: string, weather: CurrentWeather) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // A Map iterates in insertion order, so the first key is the oldest
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { weather, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function fetchCurrent(keys: string[]): Promise<void> {
  const latitudes = keys.map((k) => k.split(",")[0]).join(",");
  const longitudes = keys.map((k) => k.split(",")[1]).join(",");

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", latitudes);
  url.searchParams.set("longitude", longitudes);
  url.searchParams.set(
    "current",
    "temperature_2m,weather_code,is_day,wind_speed_10m",
  );

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);

  const data = (await res.json()) as OpenMeteoResult | OpenMeteoResult[];
  const results = Array.isArray(data) ? data : [data];

  // Results come back in the same order as the coordinates we sent
  keys.forEach((key, i) => {
    const current = results[i]?.current;
    if (!current) return;
    remember(key, {
      temperature: current.temperature_2m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
      windSpeed: current.wind_speed_10m,
      observedAt: `${current.time}:00Z`,
    });
  });
}

// One result per point, in the same order. null = weather unavailable for it.
async function getCurrentWeather(
  points: Point[],
): Promise<(CurrentWeather | null)[]> {
  const keys = points.map(cacheKey);
  const now = Date.now();

  // Only ask the provider for places that are not cached (or have expired)
  const missing = [
    ...new Set(keys.filter((k) => (cache.get(k)?.expiresAt ?? 0) <= now)),
  ];

  if (missing.length > 0) {
    try {
      await fetchCurrent(missing);
    } catch (error) {
      console.log(error);
    }
  }

  return keys.map((k) => cache.get(k)?.weather ?? null);
}

export const weatherService = { getCurrentWeather };
