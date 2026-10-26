# 0001: The backend is a separate app, called only by the Next.js server

Status: Accepted

## Context

Next.js can contain its own backend code (server actions, route handlers). The
goal of this project is to practice a full stack setup the way many companies
run one: a frontend and an API that are separate programs.

## Decision

The backend is its own Node app (this repo) with its own database connection.
The Next.js app calls it with `fetch` from the Next **server** (server actions
and server components). The browser never calls it directly.

## Consequences

- The browser only ever talks to Next.js. This API does not show up in the
  browser's Network tab.
- No CORS is needed. CORS is the browser rule about calling another origin, and
  the browser is not involved in this call.
- Only this app has the database credentials. The frontend cannot reach the
  database, even by mistake.
- Two apps to run and keep in sync. A change to an endpoint means a change in
  both repos.
- If a mobile app or other client is added later, it can use the same API.
  That client would call the API directly, so CORS and a token strategy would
  need to be revisited.
