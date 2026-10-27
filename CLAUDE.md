# VIBE project (read first)

This is the **vibe** copy of the backend, separate from `../backend-part` (the hand-written learning project). `backend-part` and `../frontend-part` must stay untouched: never read-modify them from here. This project pairs with `../frontend-vibe`.
Purpose of this project and session: an experiment to see how far stating "documentation" (this file) alone brings the implementation. Keep this file accurate: it is the spec the work is driven from.

# App definition (the spec; build from this, do not widen it)

**Weather for saved places.** A logged-in user saves places (Home, Work, Mum) and sees the forecast for each. Login is required for everything except `POST /login` and `POST /signup`.

In scope:
- Accounts and sessions (done).
- **Preferences** on the user: `language`, `units` (columns on `users`). Preferences are not places.
- **Places**: a saved place is a name plus coordinates, owned by one user. Table `places` (not "addresses", so it is never confused with a postal address): `id`, `user_id` FK (`ON DELETE CASCADE`), `label`, `name`, `country`, `region`, `latitude` and `longitude` (`double precision`, full precision), `elevation` (optional), `timezone`, `is_default`, `created_at`. Max 20 places per user.
- **Place search** through the Open-Meteo Geocoding API: the user types a name, picks a result, the chosen result becomes a place. Users never type coordinates.
- **Forecast** through the Open-Meteo Forecast API: current conditions, next 24 hours, next 7 days. Always returned with a "retrieved at" time. The frontend shows the attribution "Weather data by Open-Meteo.com" (CC BY 4.0).

Out of scope (do not add without changing this section): shipping or postal addresses, map UI, PostGIS, sharing places between users, roles, push alerts, anonymous access.

Endpoints to build (all behind the guard):
- `GET /places/search?q=` returns candidate places from the geocoder (not saved).
- `GET /places`, `POST /places`, `PATCH /places/:id`, `DELETE /places/:id`: the logged-in user's own places.
- `GET /places/:id/forecast`: the backend loads the saved place and calls Open-Meteo with its stored coordinates. The client never sends coordinates for a forecast.
- `PATCH /users/me/preferences` updates `language` and `units`.

Rules:
- **Ownership:** every query on `places` filters by the session's user id. Another user's place id returns 404, never the data (otherwise it is an IDOR). This is the use case that finally puts the user on `req`: the guard sets the user id after the session check.
- **Upstream calls** (geocoder, forecast) live in their own service files, never in a controller. Map upstream failures to our own statuses (e.g. 502 or 503), and cache forecasts in memory per place for a few minutes (confirm the exact duration against Open-Meteo's terms of use before relying on it).
- Do not log full place names or coordinates together with a user id.

# Project context

Learning project: Next.js fullstack app. Developed ad hoc, no fixed roadmap.
Backend is decided: a separate Node app (this one), the frontend (`../frontend-vibe`) calls it over `fetch` from the Next server (server components/actions), not from the browser. Ask before adding backend-specific code.
Current state: signup and login work end to end, called by the frontend over `fetch`. The code is TypeScript (ESM, run with `tsx`) on Express 5.
- Structure is built for many APIs. Request path: `server.ts` (only `initDb()` and `app.listen` on port 8080, ONE server) > `app.ts` (builds the Express app without listening, so tests can import it) > middleware in order: `middleware/userAuthorized.ts` (default deny, public list `POST /login`, `POST /signup`, checks the session with `authService.isSessionActive`, uses `req.path`), `express.json()`, `routes/index.ts`, then `notFound` and `errorHandler` from `middleware/errorHandling.ts`.
- Routes: each module owns an `*.routes.ts` (an Express `Router`, URL + method to controller, no logic): `modules/auth/auth.routes.ts` (`POST /login`, `/signup`, `/logout`) and `modules/users/users.routes.ts` (`GET /me`, mounted under `/users`). `routes/index.ts` is the one place that mounts every module. To add an API: create `modules/<name>/` with controller/service/repository/routes, then add one `routes.use(...)` line in `routes/index.ts`. Shared cross-module middleware lives in `middleware/`.
- Each module is split in three layers (no ORM yet, the repository holds raw SQL; Drizzle will replace what is inside it):
  - `*.controller.ts`: HTTP only (Express `Request`/`Response`: read `req.body` already parsed by `express.json()`, call the service, map the result to a status, write `res.status(x).json(...)`). Keeps the debug `console.log`s and the try/catch that returns 500.
  - `*.service.ts`: business rules, no `req`/`res`, no SQL, no HTTP statuses (returns results like `{ reason: "validation" | "duplicate", errors }` or `null`; the controller maps them to 400/409/401).
  - `*.repository.ts`: SQL only (`pool.query`), the only files importing `pool`. The `users` table belongs to the users module, so auth goes through `usersService`.
  - `auth.helpers.ts`: `hashPassword` / `verifyPassword` (scrypt, `salt:hash`, constant-time compare). Rule: a helper lives next to who uses it; shared HTTP helpers live in `helpers/`. `helpers/sendJson.ts` is now unused (controllers use `res.status().json()`), pending deletion.
- Auth: `signup` validates on the server (400 field errors), hashes, creates the user (409 on duplicate email; the repository turns Postgres `23505` into `null`). `login` verifies the password, creates a random 64-hex session ID (20 minutes) in `sessions`, returns `{ user, session: { id, expiresAt } }` (401 on wrong credentials). `logout` deletes the session row (`Authorization: Bearer <id>`).
- Users: `GET /users/me` (`usersController.getCurrentUser`) uses `usersService.getUserBySession`, which returns the user only if `expires_at > now()` (200 with the user, 401 otherwise). `incrementLoginCount(userId)` does `login_count = login_count + 1` in SQL (no read-modify-write race); `login` calls it after the session insert.
- `db.ts`: Pool plus `initDb()` creating the `practice` DB, `users` and `sessions` (`user_id` FK, `ON DELETE CASCADE`) if missing.
- Error handling: malformed JSON or a non-object body (`null`, `5`) returns 400 `{ message: "Invalid JSON" }` (`express.json()` rejects malformed JSON and `errorHandler` in `middleware/errorHandling.ts` maps it to 400; an empty body leaves `req.body` undefined, so `signup`/`login` also check it inline). The same error middleware returns 500 `{ message: "Something went wrong" }` for anything else thrown (Express 5 forwards rejected async handlers to it). Public-route and route matching use `req.path`, without the query string.
- Decided: the guard stays a yes/no check (`isSessionActive`); no user on `req` until a real use case needs it (e.g. addresses owned by the logged-in user).
- Not built yet: expired-session cleanup, transactions for login (a failed counter update after the session insert leaves an orphan session row), CORS/`OPTIONS` (not needed while only the Next server calls the BE), 405 for a known path with the wrong method.

## Next steps (in order)

1. (done) Auth guard: Express middleware, default deny, public list `/login`, `/signup`. Putting the user on `req` is deferred until there is a use case.
2. (done) One error middleware (500) and 400 for malformed JSON.
2b. (done) Migrated from raw `http` to Express 5 + TypeScript, single server on port 8080.
3. Guard puts the user id on `req` (typed), so handlers know who is calling.
4. `places` module: table in `db.ts`, CRUD, ownership checks, 20-place cap.
5. Place search (`GET /places/search`) with an Open-Meteo geocoding service.
6. Forecast (`GET /places/:id/forecast`) with an Open-Meteo forecast service plus a small in-memory cache.
7. Preferences (`PATCH /users/me/preferences`).
8. Cleanup of expired sessions.
9. Later: roles/permissions (`role` column, `requireRole`), forgot password (reset token with expiry), migrations instead of `CREATE TABLE IF NOT EXISTS`.

## Still unclear to me (re-explain simply when I ask, in Serbian if I write Serbian)

- Who checks that a session is active in `sessions`, and on which call: every protected BE endpoint checks it itself on every request that reaches it (cheap primary-key lookup); the FE does not ask `/me` before each action.
- `/users/me` (`usersController.getCurrentUser`) is a feature (returns the user), not the authorization itself; the guard's session check (`authService.isSessionActive`) is the shared check.
- Why the FE never talks to the DB: only the BE has the DB connection.
- Error flow across the whole chain: who returns and who throws errors, from the BE server to the Next server and then to the browser, and what each of them does with an error (what the BE sends, what the Next server turns it into, what the browser finally sees). I don't know this yet and will learn it by building (e.g. `error.tsx`, one 401 handler, the Express error middleware). Re-explain with a simple end-to-end example when I ask.

# How to work with me

- I'm learning: briefly explain the why, don't refactor or "fix" code I didn't ask about.
- Debug logging (console.log) is intentional. Don't remove it.
- Only change what I ask. Suggest improvements, don't apply them.
- When I ask for a review, list mistakes as concepts (what's wrong, why it matters, the fix), most important first.
- Don't print web Claude lesson prompts unless I ask. When I do ask: SHORT and focused on the ONE core concept (max 2 if inseparable), one or two diagrams, practical "how to implement it", no side topics. Concept-only: no code snippets or project specifics (file names, components); describe mistakes as general concepts/anti-patterns.
- NEVER overwrite an existing file without reading it first (especially `package.json`: my `pnpm init` fields and manual scripts must be preserved). Edit only the specific lines needed, never rewrite whole files.
- Keep answers short, a few lines at a time.
- When giving terminal commands, explain what each line/flag does.
- Avoid OS-specific tooling (no Homebrew services). I work on Mac now but may switch to Windows.

# Conventions

- pnpm for packages
- ESM (`import`/`export`, `"type": "module"`), not CommonJS `require`

# Project layout

```
my-app/
├─ frontend-vibe/   (the Next.js app this BE serves)
├─ backend-vibe/    (this Node BE, own package.json)
├─ frontend-part/   (hand-written original, do not touch)
├─ backend-part/    (hand-written original, do not touch)
└─ db/              (local Postgres data + SQL)
```

# Decisions log

Update this section as decisions get made (e.g. "BE is now a separate app at ../backend-part").

- Goal: become confident enough to apply for full stack positions. Favor industry-standard patterns and explain how they come up in interviews.
- Backend: separate Node + Express app (TypeScript), sibling folder `../backend-part`. `services/` in this app becomes `fetch` calls to its API.
  - Update: in this vibe project the BE is TypeScript (ESM, `tsx`) on Express 5, using the `pg` driver directly. No ORM yet.
- Database: SQL with an ORM. I know schemas, keys and joins but need a refresher, so show the generated SQL and explain relational concepts. Proposed, not yet confirmed: Drizzle + PostgreSQL. Hosting/Docker setup is undecided, don't assume it.
  - Update: PostgreSQL 16 is confirmed and running locally. Currently using raw `pg` (Pool), no ORM yet. Docker deferred.
- Planned BE layering (when Express + ORM come in): route (URL + method to controller) > controller (HTTP only: read `req`, call the service, write `res`; this is the "handler") > service (business rules, e.g. `auth.service.js`) > data access (ORM queries, replaces hand-written SQL in services). Next.js is not a layer here, it is the client calling the routes. The auth guard becomes Express middleware, error handling becomes one error middleware.
- Mini test before migrating to Express (I answer, Claude only checks): name 3 pieces of hand-written code in `server.js` that Express makes redundant. Result (2026-10-15): passed, with one correction. Named: `express()` replaces `run` as the function passed to `http.createServer` (it is a function, not an object; `app.listen` is the shortcut); routing replaces the `if (method && path)` chain, `getPath` and the 404 fallback; `app.use` middleware replaces `steps`/`next`/`run`; `res.status().json()` replaces `sendJson`. Correction: body reading + `JSON.parse` is not automatic, it is the opt-in `express.json()` middleware.
- Next focus: authentication (login first, then sessions, route protection). Auth flow: backend verifies credentials and issues the token/session, Next.js keeps it in an httpOnly cookie.

# Local database setup (current)

- Postgres is started manually with `pg_ctl` (not `brew services`, not Docker).
- Data folder: `../db/db/pgdata` (nested `db/db` by accident; may be tidied to `db/pgdata`).
- Initialized with `initdb --locale=C -E UTF8`. Starting needs `LC_ALL=en_US.UTF-8`, otherwise the server fails on macOS.
- Auth: local "trust" (user `boha1704`, no password). Port 5432.
- Database: `practice` (created by `initDb()` if missing). Tables are created with `CREATE TABLE IF NOT EXISTS` in `db.ts`:
  - `users`: `id SERIAL PK`, `username TEXT UNIQUE NOT NULL` (constraint `users_username_unique`; it holds the email the user types at signup/login, there is no separate `email` column), `password_hash TEXT NOT NULL` (`salt:hash`, scrypt), `login_count INTEGER NOT NULL DEFAULT 0`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - `sessions`: `id TEXT PK` (random 64-hex opaque session ID), `user_id INTEGER NOT NULL` (FK to `users(id)`, `ON DELETE CASCADE`), `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Relation: one user has many sessions (1:N). Deleting a user deletes their sessions. Expired rows are not cleaned up yet.
- `backend-vibe/package.json` scripts:
  - `db:start`: `LC_ALL=en_US.UTF-8 pg_ctl -D ../db/db/pgdata -l ../db/logfile start`
  - `db:stop`: `pg_ctl -D ../db/db/pgdata stop`
  - `dev`: starts Postgres if `pg_isready` fails, then `tsx watch server.ts`
- Postgres keeps running after the terminal closes; stop it with `pnpm db:stop`.
- BE: `db.ts` (Pool, `initDb()` creating the DB and both tables if missing) and `server.ts` + `app.ts` (Express app on 8080, auth endpoints behind the guard, other requests return 404; see the structure above).

# Where I am (knowledge)

Covered so far:

- Node basics: V8 + built-in modules (`http`, `fs`, `net`), minimal server, `req`/`res`, `writeHead`/`write`/`end`, why a missing `end()` hangs the client.
- Networking: TCP connection and handshake, keep-alive, `net` (raw TCP, own protocol) vs `http`, WebSocket as its own protocol starting with an HTTP upgrade, OSI layers (when they apply and when not).
- Database: DB server as a separate program on a port; SQL is the language and Postgres runs it; server > database > schema > table; constraints vs columns; `psql` basics (`\d`, `\q`, `;`, `=#` vs `-#` prompt); TablePlus is only a client.
- Node + DB: `Client` vs `Pool`, module caching acts as a singleton, `$1` placeholders against SQL injection, ESM vs CommonJS.
- Migrations: concept understood (numbered SQL files plus a tracking table). Next step offered: write a tiny migration runner by hand before using a tool.

Notes:

- I prefer `psql` over the TablePlus GUI for checking structure.
- Docker concepts (image vs container, compose, service names as hosts) explained but not used yet.
