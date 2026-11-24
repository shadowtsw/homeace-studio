# HomeAce Studio

Home Assistant add-on: a better UI for automations, scripts, scenes and helpers. One repo with `frontend/`,
`backend/` and the add-on folder `homeace-studio/`.

Machine-specific notes (e.g. where shared coding guidelines live) go into `CLAUDE.local.md`, which is
git-ignored.

## Conventions

- TypeScript everywhere, Prettier with semicolons and double quotes, max line length 100.
- Backend (NestJS): controller → service → repository interface → HA implementation; every response uses the
  envelope `{ message, error, data }` with message IDs from `backend/src/messages/` (see docs/api.md).
- Frontend (Vue 3, `<script setup>`): no UI library, own components on the tokens in `src/styles/tokens.css`;
  all texts through vue-i18n (`src/locales/de.ts` is the schema, `en.ts` and `ru.ts`
  must match; ru plurals have one form more than en, see `src/i18n/pluralRules.ts`).
- Commits: Conventional Commits (`feat(frontend): …`).

## Wiki

Read before researching the code; update when something changes.

- [docs/architecture.md](docs/architecture.md): structure, HA APIs used, data flow
- [docs/api.md](docs/api.md): backend endpoints
- [docs/setup.md](docs/setup.md): local dev, POC scripts, add-on install
- [docs/decisions.md](docs/decisions.md): decision log

## Commands

```bash
node --env-file=.env poc/categories-test.mjs   # POC step 1, read-only without flags

cd backend
npm run start:dev        # local dev server, reads ../.env
npm run lint:check       # lint without fixing
npm test                 # unit tests
npm run build

cd frontend
npm run dev              # http://localhost:5173, proxies /api to :3000
npm run lint:check
npm test
npm run build
```

After dependency changes, regenerate the `package-lock.json` with npm 10 (see docs/setup.md).
