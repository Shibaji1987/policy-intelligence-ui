# ADR 0001: Feature-first standalone Angular

- Status: Accepted
- Date: 2026-06-14

## Decision

Use standalone components and lazy feature routes. Organize code by business
capability, with shared infrastructure limited to genuinely cross-cutting code.

## Consequences

- Feature ownership and later route-level code splitting remain clear.
- Typed API clients isolate backend transport concerns.
- Components use signals for local view state and RxJS at asynchronous
  boundaries.
