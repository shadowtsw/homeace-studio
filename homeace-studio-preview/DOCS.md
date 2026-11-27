# HomeAce Studio Preview

The next HomeAce Studio release, a few days before it is announced. It is not a test build: what
appears here is finished and becomes the normal **HomeAce Studio** once it has run quietly for a while.
While a version is in the Preview it only gets fixes, never new features.

## Before you install

- **Make a backup first.** The Preview works on your real automations, scripts, scenes, helpers,
  categories and labels, just like the normal app.
- **It can run next to the normal app.** Both appear in the sidebar ("HomeAce Studio" and
  "HomeAce Preview"). Each keeps its own extras (folder colors, favorites, notes) in its own config
  folder; folders themselves live in Home Assistant and are shared.
- **AI access (MCP):** if you switch it on in both apps, give each one its own host port under
  Configuration → Network, e.g. 8098 for the normal app and 8097 for the Preview.

HomeAce Studio Preview needs Home Assistant 2025.8 or newer, on amd64 or aarch64.

## Installation

1. Settings → Apps → App store → ⋮ → Repositories: add
   `https://github.com/shadowtsw/homeace-studio` (if it is not there yet).
2. Open "HomeAce Studio Preview", install, start, and turn on "Show in sidebar".

Everything else works as in the normal app; its documentation covers the details.

## Feedback

Something odd? Gear icon → About HomeAce → "Give feedback". It opens a prepared form on GitHub with
the version filled in. Nothing is sent automatically.
