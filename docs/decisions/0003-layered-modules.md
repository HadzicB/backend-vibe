# 0003: Each feature is split into routes, controller, service, repository

Status: Accepted

## Context

Putting everything for an endpoint in one function (read the request, check the
rules, run the SQL, write the response) is quick at first. It becomes hard to
change, because HTTP details, business rules and SQL are tangled together, and
hard to test, because you cannot try a rule without an HTTP request.

## Decision

Every feature is a folder in `modules/` with four files, each with one job:

- `routes`: URL and method to controller
- `controller`: HTTP only (read the request, write the response, pick the status)
- `service`: business rules, no HTTP and no SQL
- `repository`: SQL only

The service never returns HTTP status codes. It returns results like
`{ reason: "duplicate" }` or `null`, and the controller maps them to 409 or 401.
Only repositories import the database pool.

## Consequences

- You know where to look for any kind of change.
- Replacing raw SQL with an ORM later only touches the repository files.
- Replacing the web framework only touches routes and controllers.
- More files and a little more code for small features. It pays off as the
  number of features grows.
- A module must not write SQL against another module's table. It calls that
  module's service instead (auth uses `usersService`).
