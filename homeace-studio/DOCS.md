# HomeAce Studio

A clearer UI for automations, scripts, scenes and helpers.

- **Nested folders:** as deep as you like. They stay visible in Home Assistant and keep working without
  HomeAce Studio.
- **Move** entries by dragging them onto a folder, or with the category field in the detail view. Missing
  categories are created and emptied ones (created by HomeAce Studio) are removed automatically.
- **Rename** a folder and everything below it in one go, with a preview.

## Installation

Since HA 2026.2, add-ons are called **apps** in the UI; it is the same thing.

HomeAce Studio needs Home Assistant 2025.8 or newer.

1. Settings → Apps → App store → ⋮ → Repositories: add
   `https://github.com/shadowtsw/homeace-studio`.
2. Open "HomeAce Studio" in the app store, install, start, and turn on "Show in sidebar".

HA downloads a ready-made image (amd64 or aarch64); nothing is built on your HA.

### Coming from a local install

A local install keeps its extras (folder colors, favorites, notes) in
`/addon_configs/local_homeace_studio/overlay.json`. The installed app uses its own folder, ending in
`_homeace_studio`, which appears after its first start. Copy `overlay.json` over (e.g. with the
"Samba share" app), restart the app, then uninstall the local one. Categories live in Home Assistant
itself and need no copying.

## AI access (MCP)

An AI client such as Claude Code can propose folder plans. It reads names, kinds, folders, areas
and labels, never flows, states or notes, and it cannot change anything: every plan waits in
HomeAce Studio until you apply it.

1. Settings → Apps → HomeAce Studio → Configuration → Network: enter a host port for
   "AI access (MCP)", e.g. 8098, save and restart the app. Without a port the endpoint is closed.
2. In HomeAce Studio: gear icon → AI access (MCP) → switch it on. A token is created.
3. Copy the command shown there, e.g. for Claude Code:
   `claude mcp add --transport http homeace http://<your-ha>:8098/mcp --header "Authorization: Bearer <token>"`

The port is meant for your home network. Do not forward it to the internet. "Create new" replaces
the token at once.

## Data

HomeAce Studio has no database. Its own extras live in `overlay.json` in the add-on's config folder
(`/addon_configs/<id>_homeace_studio/`), which is part of HA backups.
