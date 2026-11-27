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
  all texts through vue-i18n (`src/locales/de.ts` is the schema; `en.ts`, `fr.ts`, `es.ts` and `ru.ts`
  must match, every new text in all of them; ru plurals have one form more than en, see
  `src/i18n/pluralRules.ts`).
- Code both sides need lives once in `core/` (plain TypeScript, no dependencies); edit it there and run
  `node scripts/sync-core.mjs`, never edit `frontend/src/core/` or `backend/src/core/` (see
  [docs/recipes.md](docs/recipes.md#shared-code-in-core)).
- Commits: Conventional Commits (`feat(frontend): …`).

## HA releases first

Whatever the task, start every session by looking at the "Check log" in
[docs/ha-compatibility.md](docs/ha-compatibility.md). If a Home Assistant beta or release is out
without a line there (beta: last Wednesday of the month, release: first Wednesday), a line still says
"not tested yet", or a HomeAce release is planned on an untested HA version, tell the maintainer in one
or two lines before anything else and offer the check ([docs/recipes.md](docs/recipes.md#ha-release-check)).

## Wiki

Read the page for the area you touch before researching the code. Update it in the same change when
something there changes. The code wins when they disagree. Pages list where what lives, the call chain,
rules and pitfalls, and recipes.

- [docs/architecture.md](docs/architecture.md): parts, module map, HA APIs, and a table "which page to read"
- [docs/api.md](docs/api.md): backend endpoints · [docs/setup.md](docs/setup.md): local dev, demo,
  releases, add-on · [docs/decisions.md](docs/decisions.md): decision log
- [docs/recipes.md](docs/recipes.md): new endpoint, HA command (+ demo), overlay field, kept preference,
  component, HA release check
- [docs/ha-compatibility.md](docs/ha-compatibility.md): what a new HA release can break, risk per area,
  quick checks, known changes, check log
- Columns (Navigation · List · Detail): [docs/ui/layout.md](docs/ui/layout.md),
  [navigation.md](docs/ui/navigation.md), [list.md](docs/ui/list.md), [detail.md](docs/ui/detail.md)
- Features in [docs/features/](docs/features/): flow-editor, scenes, helpers, folders, areas, checkup, themes,
  dependencies, run-history, entry-actions, live-updates, ai-mcp, entity-sorting, i18n

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
