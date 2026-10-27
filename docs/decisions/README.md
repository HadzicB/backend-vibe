# Decision records

An ADR (Architecture Decision Record) is a short note that answers one question:
**why did we do it this way?** Code shows what was built. These notes keep the
reasons, so you can understand them later or explain them in an interview.

Each record has the same parts: the situation (Context), what was chosen
(Decision), and what it costs and gives (Consequences).

Rules for adding one:
- One decision per file, numbered in order: `0007-short-title.md`.
- Do not rewrite an old record when the decision changes. Add a new record and
  mark the old one "Superseded by 000X".

| # | Decision |
|---|---|
| [0001](0001-separate-backend.md) | The backend is a separate app, called only by the Next.js server |
| [0002](0002-server-side-sessions.md) | Server-side sessions with random IDs instead of JWT |
| [0003](0003-layered-modules.md) | Each feature is split into routes, controller, service, repository |
| [0004](0004-express-and-typescript.md) | Express 5 and TypeScript |
| [0005](0005-raw-sql-for-now.md) | Raw SQL with `pg` for now, ORM later |
| [0006](0006-default-deny-guard.md) | One guard in front of everything, default deny |
| [0007](0007-saved-places-not-addresses.md) | The app stores saved places, not postal addresses |
| [0008](0008-open-meteo-for-search-and-forecast.md) | Open-Meteo for both place search and forecast |
