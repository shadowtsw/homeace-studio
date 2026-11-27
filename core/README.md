# core

Plain TypeScript that the frontend and the backend both need, without any dependency and without
Home Assistant: today the theme model and the check of an imported theme (the browser checks it in
its gate, the backend checks it again before it stores it). Later the dry-run engine and the
templates of 0.16 join.

- **Edit only here.** `node scripts/sync-core.mjs` copies everything into `frontend/src/core/` and
  `backend/src/core/`; each side builds its copy like its own code. The checks fail while a copy
  differs (`scripts/check-core-copies.mjs`).
- Relative imports only, no `@/…`, nothing from Vue, NestJS or the DOM. No user-facing texts: return
  codes, the frontend says them in the user's language.
- Tests sit in `__tests__/` folders and use Vitest; they are copied to the frontend only and run with
  its tests.
- Why copies and not a package: the Dockerfile, `build-addon.mjs` and the image workflow stay as they
  are (owner's decision 2026-11-27). A real package is possible later without changing the code here.
