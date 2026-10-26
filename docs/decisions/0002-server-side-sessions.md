# 0002: Server-side sessions with random IDs instead of JWT

Status: Accepted

## Context

After login, the server must recognise the user on later requests. The two
common options:

- **Server-side session:** the server stores a record and gives the client a
  random ID that points to it.
- **JWT:** the server gives the client a signed token that contains the user's
  data. The server can check the signature without looking anything up.

## Decision

Server-side sessions. Login creates a random 64-character ID (32 random bytes
as hex), stores it in the `sessions` table with an expiry 20 minutes away, and
returns it. The ID carries no information. It is only a key.

## Consequences

Good:
- **Instant logout and revocation.** Deleting the row ends the session at once.
  A JWT stays valid until it expires unless you add extra machinery (a denylist,
  or short expiry plus refresh tokens).
- Simple to understand and to get right.

Cost:
- **A database lookup on every protected request.** It is a primary key
  lookup, so it is cheap here, but it does not scale the way a stateless token
  does.
- Expired rows pile up until a cleanup job exists (not built yet).

Revisit when: several independent services need to verify users without
sharing one database, or the per-request lookup becomes a real bottleneck.
