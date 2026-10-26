# 0005: Raw SQL with `pg` for now, ORM later

Status: Accepted for now. An ORM is expected later, not yet chosen.

## Context

Using an ORM from day one hides the SQL. A goal here is to refresh relational
concepts (keys, constraints, joins) by seeing the real queries.

## Decision

Repositories run hand-written SQL through the `pg` driver and one shared
connection `Pool`. Values always go through `$1, $2` placeholders, never string
concatenation, so user input cannot become SQL (SQL injection).

Tables are created with `CREATE TABLE IF NOT EXISTS` at startup in `db.ts`.

Drizzle with PostgreSQL is the likely ORM, but that is a proposal, not a
decision.

## Consequences

- You see and control every query.
- Because only repositories contain SQL (see 0003), adding an ORM later means
  rewriting the inside of those files, not the rest of the app.
- No migrations: `CREATE TABLE IF NOT EXISTS` cannot change a table that already
  exists. The first schema change will need a real migration approach.
- Rows come back untyped (`any`). An ORM would give typed results.
