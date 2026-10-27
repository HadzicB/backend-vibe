# 0007: The app stores saved places, not postal addresses

Status: Accepted

## Context

The app is a weather app for places a user cares about. It was tempting to add
an "addresses" table that could later also serve shipping, maps and
customisation. One table serving unrelated purposes grows columns nobody can
explain and rules that conflict.

## Decision

- The table is called `places` and holds a name plus coordinates, owned by one
  user. It has no street or postal code. If shipping is ever built, it gets its
  own table with its own rules.
- Language and units are **preferences**, stored on the user (`users.language`,
  `users.units`). A place is not a preference.
- Coordinates are stored at full precision (`double precision`). Rounding is an
  upstream requirement, applied only when calling a provider that needs it.
- Users never type coordinates. They search for a name and pick a result.
- A forecast is requested by place id. The backend loads the stored
  coordinates, so a client cannot make the backend query arbitrary locations.
- Every query on `places` filters by the session's user id. Someone else's
  place id returns 404.

## Consequences

- The data model stays small and each field has one purpose.
- A shop or shipping feature, if added later, is a new module, not a change to
  `places`.
- The guard has to put the user id on `req`, which the earlier yes/no check did
  not do. This is the feature the earlier "not until needed" decision was
  waiting for.
- Ownership checks are required in every `places` query. Forgetting one is an
  IDOR (reading or changing another user's data by guessing its id).
