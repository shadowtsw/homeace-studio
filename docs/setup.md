# Setup

## Local development against a real HA

1. Copy `.env.example` to `.env` in the project root and fill in `HA_URL` and `HA_TOKEN`
   (HA profile → Security → Long-lived access tokens). `.env` is git-ignored.
2. Node.js 22 or newer (has a built-in `WebSocket`, so the POC scripts need no packages).

## Local test environment (outside Home Assistant)

Test a change the way the app runs, before a release: one server for UI and API on port 8099, the AI
access (MCP) on 8098.

- **Without Docker:** `node scripts/local.mjs --demo` (invented home) or `node scripts/local.mjs`
  (your HA from `.env`). Installs missing packages, builds both parts, starts the backend with the
  built UI. `--skip-build` starts the last build again.
- **With Docker:** `docker compose --profile demo up --build` or `docker compose --profile ha up --build`
  (`compose.yaml`). Builds the same image as the release workflow, from the repo root.

Against your HA both really change things, like the installed app; extras go to `data/overlay.json`.
Open http://localhost:8099.

## Demo mode (no Home Assistant needed)

With `HOMEACE_DEMO=true` the backend uses an invented home kept in memory (`backend/src/demo/`):
nested folders, automations and scripts with all common block types, scenes, helpers, folder colors.
Everything works (move, rename, edit, save, create, delete), nothing is saved, a restart resets it.
`HA_URL` and `HA_TOKEN` are not needed and the real overlay file is not touched.

```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && npm run build
HOMEACE_DEMO=true PORT=3100 STATIC_DIR=../frontend/dist node dist/main.js   # http://localhost:3100
```

For frontend work, `HOMEACE_DEMO=true npm run start:dev` plus `npm run dev` in `frontend/` works too.
In PowerShell set the variable with `$env:HOMEACE_DEMO = "true"` first.

### README screenshots and clips

`node scripts/screenshots.mjs` takes the pictures in `docs/images/` from a running demo on port 3100
(`--url`, `--out` to change). It drives the installed Edge or Chrome headless through the DevTools
protocol, so it needs no extra package; `BROWSER_PATH` points to another browser. The pictures only
ever show the demo home, never real data. `--locale de` takes them in another language (for posts,
with `--out` outside the repo), `--with-posts` adds the pictures meant only for posts, `--only a.png,b.png`
takes just those.

`node scripts/recordings.mjs` records the short clips (drag into a flow, scene editor, sort into a
folder) as GIFs into `docs/images/`, and with `--mp4-out <folder>` also as MP4 for posts. It needs
ffmpeg on the PATH. The clips change the demo (a new automation, a sorted device), so take the
screenshots first and restart the demo before recording again.

Both share `scripts/devtools.mjs` (start the browser, click, open the app). Pitfalls found on the way:

- Edge starts extensions, updates and sync next to the page; after about 15 s every screenshot then
  waits seconds to minutes. The quiet start options in `devtools.mjs` prevent that.
- A frontend build under a Windows short path (`C:\Users\ABCDEF~1\…`) loads Vue twice and the page stays
  blank ("reading '_s'"); build the demo from a long path.
- Clips are filmed in stop motion (each pointer step one frame of fixed length), because a screenshot
  takes longer than a frame lasts. Drags and clicks are the page's own events under a drawn pointer.

### HA check

`node scripts/ha-check/run.mjs` tests the app against a new HA version before it is released
([recipes.md](recipes.md#ha-release-check)). It starts a throwaway HA (the current beta by default) with
the demo integration and the app built from this working tree, both in Docker. Then it fills HA with a
small test home and runs the quick checks of [ha-compatibility.md](ha-compatibility.md) through the
app's API, plus a few flows in the UI. Exit code 1 means a check failed.

```bash
node scripts/ha-check/run.mjs                 # HA beta, app from the working tree
node scripts/ha-check/run.mjs --ha 2026.12.0  # another HA image tag (stable, a version)
node scripts/ha-check/run.mjs --image <tag>   # an app image built before, no build
node scripts/ha-check/run.mjs --down          # remove containers, volumes and network
```

Every run starts from scratch. Afterwards both keep running to look around: HA on
http://localhost:8124 (user `ha-check`, password `ha-check-throwaway`), the app on
http://localhost:8199. It needs Docker and Node.js 22+, and the UI part needs Edge or Chrome (via
`devtools.mjs`). Not covered: HA user (ingress headers), Supervisor and icon packs.

## POC step 1: nested categories

```bash
node --env-file=.env poc/categories-test.mjs            # read-only: lists existing categories per scope
node --env-file=.env poc/categories-test.mjs --write    # creates, renames, deletes test categories
node --env-file=.env poc/categories-test.mjs --keep     # same, but keeps them to look at in the HA UI
node --env-file=.env poc/categories-test.mjs --cleanup  # deletes leftover test categories
```

Test categories always start with `HomeAce-Test`; nothing else is changed. The script tests all four scopes
(`automation`, `script`, `scene`, `helpers`): names with one and two `/`, listing, renaming a nested path, and
whether HA refuses duplicate names.

## POC step 6a: what the editor must support

```bash
node --env-file=.env poc/automation-inventory.mjs   # counts trigger, condition, action types (read-only)
node --env-file=.env poc/editor-schema-probe.mjs    # descriptions HA offers for the editor (read-only)
```

## Backend

```bash
cd backend
npm install
npm run start:dev        # http://localhost:3000/api/entries, reads ../.env
npm run lint:check
npm test
npm run build
```

The add-on image will build with `node:22` (npm 10). After changing dependencies, regenerate the lockfile with
npm 10, otherwise `npm ci` in the image fails:

```bash
npx -y npm@10.9.9 install --package-lock-only --ignore-scripts
npx -y npm@10.9.9 ci --dry-run --ignore-scripts
```

## Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to the backend on :3000
npm run lint:check
npm test
npm run build
```

Start the backend first (`cd backend && npm run start:dev`). Moving entries writes the overlay to
`data/overlay.json` in the project root (git-ignored); `OVERLAY_FILE` in `.env` changes that. The same npm 10 lockfile rule applies to
`frontend/package-lock.json`. `create-vue` sets `engines.node` to `^22.18.0 || >=24.12.0`; older local
Node 24 versions only print a warning.

## Releases

Raising `version` in `homeace-studio/config.yaml` on `main` starts the workflow
`.github/workflows/build-images.yml`. It runs in three steps:

1. **Checks** (`.github/workflows/checks.yml`): lint, tests and build of frontend and backend.
2. **Images** for amd64 and aarch64, only when the checks pass, pushed to
   `ghcr.io/shadowtsw/homeace-studio-<arch>:<version>`. `config.yaml` names that image (`image:`), so HA
   downloads it.
3. **Release:** tag `v<version>` and a GitHub release whose notes are the section `## <version>` of
   `homeace-studio/CHANGELOG.md`; it fails when that section is missing.

Write the highlights for "Was ist neu" in `frontend/src/constants/whatsNew.ts` (3–6 points in plain words,
every UI language; a test fails when the new version has none). A local image (`BUILD_VERSION=local`)
shows the newest highlights, so `docker compose --profile demo up --build` previews them.

Push the version change only together with that CHANGELOG section (rename "## Unreleased"); HA shows the
update right away, and the download works once the workflow is done (a few minutes). The packages on
ghcr.io must be public (GitHub → profile → Packages → package → Package settings → Change visibility).

The checks also run on every push to `main` and on every pull request, Dependabot's included
(`.github/dependabot.yml`: weekly npm updates, grouped; monthly actions and the Node base image).

### Preview channel

`homeace-studio-preview/` is a second app, **HomeAce Studio Preview** (slug `homeace_studio_preview`),
built from the same sources. It holds only what differs: `config.yaml`, `DOCS.md`, `CHANGELOG.md` and the
icons; `node scripts/build-addon.mjs --channel preview` assembles it from `homeace-studio/` plus these
files. `scripts/check-preview-config.mjs` (part of the checks) fails when its `config.yaml` differs from the
normal one in anything but name, version, slug, description, image and panel title, so the Preview never
asks HA for more access.

Raising `version` in `homeace-studio-preview/config.yaml` on `main` starts
`.github/workflows/build-preview.yml`: the same checks, then the images
`ghcr.io/shadowtsw/homeace-studio-preview-<arch>:<version>`. On purpose there is no tag and no GitHub
release (a release notifies everyone who watches the repository); the image label
`org.opencontainers.image.revision` keeps the commit. Make the two new packages public once, like the
normal ones.

The app knows it is the Preview from its version (`0.15.0-preview.2`, `utils/releaseChannel.ts`): it then
shows a "Preview" mark in the top bar and "Give feedback" under About HomeAce, which opens the issue form
`.github/ISSUE_TEMPLATE/preview-feedback.yml` (label `preview`) with the version filled in. The repository
needs the label `preview` once.

The rules the maintainer works by:

1. Only finished releases go into the Preview, with the same quality as a normal release.
2. Before the Preview: the same steps as before any release (test build on a real HA, two approvals).
3. While a version waits in the Preview: fixes only; no new features, no logic or breaking changes.
4. Fixes count up only in the Preview (`0.15.0-preview.1` → `.2`); the normal line gets no extra version.
5. When it moves on, the very code that last ran in the Preview becomes the normal version (`0.15.0`); the
   normal changelog does not list the Preview fixes one by one.
6. It moves on when the announcement is ready and nothing serious is open; there is no fixed waiting time.
7. Moving on needs its own approval; announcements come only after that.
8. An urgent fix for the normal app also goes into the Preview, so the Preview is never behind.
9. A serious problem gets a quick `preview.N+1`, or the Preview goes back to the normal app's state; so the
   Preview never changes its own stored data in a way that going back would break.
10. After moving on, both apps are the same until the next release comes into the Preview.

## As an add-on (local app on HA OS, for development)

Since HA 2026.2 the UI calls add-ons **apps** (Settings → Apps). The "Marketplace" (2026.11) is the former
HACS for integrations and cards and is not involved here.

The Supervisor builds the image on HA, from the add-on folder only. That folder therefore needs the sources
next to `config.yaml` and the `Dockerfile`; `scripts/build-addon.mjs` assembles it and removes the
`image:` line, so HA builds the local app from source instead of downloading the released image.
A local app and the installed one can exist side by side; they have separate config folders.

1. On HA, install the **Samba share** app (or **Advanced SSH & Web Terminal**) so `/addons` is reachable.
   Settings → Apps → App store (direct: `/config/apps/available`); Samba needs a username and password.
   Samba hides names in its `veto_files` list (by default `icon?` for Mac icon files, which also
   matches a folder called `icons`). So no file or folder in the app may be named like that.
2. Assemble the folder, straight onto the share or locally to copy it yourself:

   ```bash
   node scripts/build-addon.mjs --to \\homeassistant.local\addons  # → /addons/homeace_studio
   node scripts/build-addon.mjs                                       # → dist-addon/homeace_studio
   ```

3. In HA: Settings → Apps → App store → ⋮ → **Check for updates**, reload the page. "HomeAce Studio"
   shows up under **Local apps**. Install it (the first build takes a few minutes: `npm ci`, lint, tests and both builds
   run on HA), start it and turn on **Show in sidebar**.
4. After code changes: run step 2 again and raise `version` in `homeace-studio/config.yaml`.
   - The Supervisor keeps its own copy of local apps; "Check for updates" does not always notice a new
     version (seen on HA 2026.11.2: the update dialog kept showing the old version, "Update" greyed out).
   - Reliable: in the **Terminal & SSH** app run `ha store reload`, then **Update** on the app page.
   - Without a terminal: **Uninstall** the app (keep its data, so `overlay.json` stays), Check for updates,
     reload the page, **Install** again.
   - **Rebuild** only works without a version change; with a new version the Supervisor asks for an update.

Inside the container: `PORT=8099` (ingress port), `STATIC_DIR=/app/public` (built frontend),
`OVERLAY_FILE=/config/overlay.json` (`addon_config` mapping, part of HA backups). HA access comes from
`SUPERVISOR_TOKEN` (`homeassistant_api: true`); no `.env` is needed.

To try the production setup without Docker: build both parts, then

```bash
cd backend
PORT=8099 STATIC_DIR=../frontend/dist node dist/main   # UI on http://localhost:8099, API under /api
```
