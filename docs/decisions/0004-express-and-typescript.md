# 0004: Express 5 and TypeScript

Status: Accepted. Replaces the earlier version built on Node's raw `http`
module and plain JavaScript.

## Context

The first version used Node's built-in `http` module. That was useful for
learning, but it meant hand-writing things every web framework provides: URL
matching, reading and parsing the body, a middleware chain, and sending JSON.
The frontend was already TypeScript.

## Decision

- Move to **Express 5**, the most widely used Node web framework, so the code
  looks like what most teams have.
- Move to **TypeScript**, run directly with `tsx` (no build step in
  development).

What Express replaced: the `if (method && path)` chain became routers, the
`steps/next/run` function chain became middleware, manual body reading and
`JSON.parse` became `express.json()`, and the central try/catch became one
error-handling middleware.

## Consequences

- Less hand-written plumbing, and a structure other developers recognise.
- Express 5 forwards errors from async functions to the error middleware by
  itself. Express 4 did not.
- Types catch a class of mistakes before running (wrong argument, missing
  field).
- Imports in the source use the `.js` extension (`"./app.js"`) even though the
  files are `.ts`. That is how TypeScript's ESM mode works, not a typo.
- There is no production build yet. For deployment, a compile step (or running
  `tsx` in production) has to be decided.
