# 0008: Open-Meteo for both place search and forecast

Status: Accepted. Check Open-Meteo's current terms of use and limits before
building.

## Context

The app needs two upstream services: place search (a name in, candidates with
coordinates out) and a weather forecast. The Norwegian met.no forecast API has
no place search, and it has strict rules (a registered `User-Agent`, caching by
`Expires` and `If-Modified-Since`, coordinates truncated to 4 decimals).

## Decision

Use Open-Meteo for both the Geocoding API and the Forecast API. One provider,
no API key, global coverage. Its geocoding results include elevation and
timezone, which are stored on the place.

Each upstream lives in its own service file. Nothing else in the backend knows
which provider is used.

## Consequences

- One set of terms to follow, and one attribution to show: "Weather data by
  Open-Meteo.com" (CC BY 4.0).
- Open-Meteo returns numeric weather codes, not icon names, so the frontend maps
  codes to icons itself.
- The free tier is for non-commercial use and has limits. Revisit if the app is
  ever commercial.
- Because the provider sits behind its own service, switching to met.no or
  another provider only touches that file.
- Upstream failures must be mapped to our own errors (for example 502 or 503),
  and forecasts are cached in memory for a few minutes.
