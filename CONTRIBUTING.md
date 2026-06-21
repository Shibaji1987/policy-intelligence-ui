# Contributing

## Local verification

```powershell
npm ci
npm run check
```

## Design rules

- Keep features self-contained under `src/app/features`.
- Keep transport contracts typed and isolated in API services.
- Prefer standalone components, signals for local state, and `OnPush`.
- Build accessible states for loading, empty, error, and success outcomes.
- Never place secrets in Angular environment files; browser code is public.
- Record consequential architecture decisions under `docs/adr`.
