# backend-vibe

The API behind the Next.js app in `../frontend-vibe`. It handles accounts and
sessions: signup, login, logout, and "who am I".

Node + TypeScript + Express 5 + PostgreSQL (raw SQL through the `pg` driver).

> How it is built: [docs/architecture.md](docs/architecture.md).
> Why it is built that way: [docs/decisions/](docs/decisions/).

## Run it

Prerequisites: Node, pnpm, and PostgreSQL 16 installed locally (`pg_ctl` and
`pg_isready` on your PATH).

```bash
pnpm install   # install dependencies
pnpm dev       # start Postgres if it is not running, then the API with auto-reload
```

The API listens on **http://localhost:8080**. On startup it creates the
`practice` database and the `users` and `sessions` tables if they are missing.

Other scripts:

| Script | What it does |
|---|---|
| `pnpm dev` | Starts Postgres if `pg_isready` fails, then `tsx watch server.ts` |
| `pnpm db:start` | Starts Postgres only (data in `../db/db/pgdata`) |
| `pnpm db:stop` | Stops Postgres. It keeps running after you close the terminal, so stop it yourself. |

There is no build step and no test suite in this repo yet. `tsx` runs the
TypeScript directly. To type-check: `pnpm exec tsc --noEmit`.

## Endpoints

| Method and path | Needs a session? | Success | Errors |
|---|---|---|---|
| `POST /signup` | no | 201 `{ user }` | 400 field errors, 409 email taken |
| `POST /login` | no | 200 `{ user, session: { id, expiresAt } }` | 401 wrong credentials |
| `POST /logout` | yes | 200 | 401 no or expired session |
| `GET /users/me` | yes | 200 `{ user }` | 401 |

Send the session ID as `Authorization: Bearer <session id>`. A session lasts
20 minutes. Any other URL returns 404 `{ message: "Not found" }`, and any
unexpected failure returns 500 `{ message: "Something went wrong" }`.

Quick try:

```bash
curl -X POST localhost:8080/signup -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"password123"}'
```

## Folder map

```
server.ts      starts the app (initDb + listen on 8080)
app.ts         builds the Express app: guard, JSON parsing, routes, 404, errors
db.ts          the connection pool + creates the database and tables
routes/        index.ts mounts every module in one place
middleware/    userAuthorized.ts (auth guard), errorHandling.ts (404 + errors)
modules/       one folder per feature: auth/, users/
helpers/       sendJson.ts (no longer used)
```

Each module has the same files: `*.routes.ts`, `*.controller.ts`,
`*.service.ts`, `*.repository.ts`. The architecture doc explains what each one
is for.

## Add a new API

1. Create `modules/<name>/` with `<name>.routes.ts`, `.controller.ts`,
   `.service.ts` and `.repository.ts`.
2. Add one line to `routes/index.ts`: `routes.use("/<name>", <name>Router);`
3. It is protected by default. Only add it to `PUBLIC_ROUTES` in
   `middleware/userAuthorized.ts` if anonymous users must reach it.

## Known gaps

- Expired sessions are never deleted from the `sessions` table.
- Login is not a transaction: if the login counter update fails after the
  session was created, an unused session row stays behind.
- Database credentials are hard-coded in `db.ts` (local trust login, no
  password). Fine for local learning, not for deployment.
- No CORS and no `OPTIONS` handling. Not needed while only the Next.js server
  calls this API, never the browser.
- A known path with the wrong method returns 404, not 405.
