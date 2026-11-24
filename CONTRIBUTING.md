# Contributing

Thanks for wanting to help. Bug reports, ideas and pull requests are all welcome.

## Issues

- **Bug:** use the bug report form; the app version (gear icon) and the Home Assistant version help a lot.
  Please remove private things (names, addresses, tokens) from logs and screenshots.
- **Idea:** describe the problem you want solved, not only the solution. What is planned is in the
  [roadmap](ROADMAP.md).
- **Security issue:** not as an issue, see [SECURITY.md](SECURITY.md).

## Translations

HomeAce Studio speaks German, English, French, Spanish and Russian. Russian came from the community;
French and Spanish are machine-assisted, so if one of them is your language, corrections are very
welcome, even a single wrong word. Issues and pull requests for this carry the label `translation`.

To add a language, have a look at the pull request that added Russian (#11). In short:

- `frontend/src/locales/<code>.ts` with every key of `de.ts` (the type checks it), the language in
  `frontend/src/i18n/index.ts` and its own name in `SettingsMenu.vue`.
- `backend/src/messages/catalog.<code>.ts` and the code in `CATALOG_LANGUAGES`
  (`backend/src/editor/editor.constants.ts`), so Home Assistant's own texts come in that language too.
- The highlights of "Was ist neu" (`frontend/src/constants/whatsNew.ts`) need the language too.
- Use the words Home Assistant uses in that language (helpers, areas, labels …), so nothing feels new.
- Plurals: if the language counts differently from English, add a rule in `frontend/src/i18n/pluralRules.ts`
  like Russian does.

## Code

For anything bigger than a small fix, please open an issue first, so we can agree on the way before
you spend time on it.

The repository holds the backend (NestJS), the frontend (Vue 3) and the app definition for Home
Assistant (`homeace-studio/`). [docs/setup.md](docs/setup.md) explains the local setup;
[docs/architecture.md](docs/architecture.md), [docs/api.md](docs/api.md) and
[docs/decisions.md](docs/decisions.md) explain how it is built and why.

The quickest way to try a change is the demo mode, which needs no Home Assistant:

```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && npm run build
HOMEACE_DEMO=true PORT=3100 STATIC_DIR=../frontend/dist node dist/main.js
```

Before a pull request, both parts should pass what the CI checks:

```bash
cd frontend && npm run lint:check && npm test && npm run build
cd ../backend && npm run lint:check && npm test && npm run build
```

Some conventions:

- Code, comments and docs in English; the UI in German and English (`frontend/src/locales`), every
  text in both.
- Small, focused pull requests; user-visible changes get a line under "Unreleased" in
  [homeace-studio/CHANGELOG.md](homeace-studio/CHANGELOG.md).
- Do not change the version in `homeace-studio/config.yaml`: that starts a release.
- New dependencies only after a short discussion in the issue.

By contributing you agree that your contribution is released under the [MIT license](LICENSE).
