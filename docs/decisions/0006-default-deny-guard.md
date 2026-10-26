# 0006: One guard in front of everything, default deny

Status: Accepted

## Context

Protecting routes one by one ("remember to check the session in this
controller") fails the day someone forgets. The safe default is that a new
route is closed until someone deliberately opens it.

## Decision

A single middleware, `userAuthorized`, runs first on every request.

- If `METHOD /path` is on the `PUBLIC_ROUTES` list, let it through.
- Otherwise it requires an active session (`Authorization: Bearer <id>`), and
  answers 401 if there is none.

The list is explicit, and today it contains only `POST /login` and
`POST /signup`.

The guard is a yes/no check. It does not attach the user to `req`. That will be
added when a feature needs "the logged-in user" (for example, addresses owned by
the user).

## Consequences

- A forgotten check cannot leave a new route open by accident.
- The session is checked on every request in the backend, so the frontend never
  has to be trusted to have checked first.
- Matching uses `req.path`, which excludes the query string, so
  `/login?x=1` still matches `/login`.
- Because the guard runs before body parsing, an unauthenticated request with
  broken JSON gets 401, not 400.
- Roles and permissions (who may do what) are a separate, later layer on top.
