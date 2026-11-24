# Roadmap

What HomeAce Studio can do, what is being built and what comes after. Every feature starts as a
click prototype, is built step by step and is tested on a real Home Assistant before it is released.
Details of each release are in the [changelog](homeace-studio/CHANGELOG.md).

Status: ✅ released · 🔨 in progress · 📋 planned · 🅿️ on hold

## In progress: the next big update

The parts are released together, after a test round on a real Home Assistant.

| Status | Feature | What it means |
| --- | --- | --- |
| 📋 | What's new | After an update a small icon next to the gear shows the highlights of the new version in plain words, with links to the new features; "OK" hides it, the gear menu keeps it |
| 🔨 | Helper settings | Ranges, steps, units, options, lengths, durations and more, with checks before saving |
| 🔨 | Duplicate helpers | A copy of a helper with its settings, folder, labels and area |
| 📋 | Scene editor | Edit the devices and states of a scene, with a live preview |
| 📋 | Entities by drag & drop | Optional list of entities (area → device → function); drop one on *When*, *And only if* or *Then* to create a block with suggestions; tap instead of drag on phones |
| 📋 | Settings per user | Each Home Assistant user keeps their own view settings |
| 📋 | Manage labels | Create, rename, recolor and delete labels right in the label picker; deleting says where the label is used |
| 📋 | Icons from icon packs | Icons from custom icon packs (e.g. Font Awesome or custom icons from HACS) show up and can be picked, when opened from the Home Assistant sidebar |
| 📋 | Info column | When the details pane is wide, a narrow column shows folder, area, labels, last run, where it is used and the note at a glance |

## Planned after that

| Status | Feature | What it means |
| --- | --- | --- |
| 📋 | Template and group helpers | Edit and duplicate them too (Home Assistant stores them differently) |
| 📋 | Visual blueprint editor | Build blueprints from scratch or from any automation, inputs panel, preview of the form users see, use a blueprint and turn it back into a normal automation |

## On hold

| Status | Feature | Why |
| --- | --- | --- |
| 🅿️ | Schedule planner | Might become its own app; decided later |

## Released

| Version | Highlights |
| --- | --- |
| ✅ 0.13.0 | Five languages: Russian from the community, French and Spanish (machine-assisted, corrections welcome); first start in the browser language |
| ✅ 0.12.1 | Opening an entry no longer loads the whole entity registry: far less CPU when clicking through |
| ✅ 0.12.0 | Change an entity ID with every reference; aliases, hidden, disabled; rename in place (double click, F2) with undo; duplicate with folder, labels and area; sort folders; fold the details pane |
| ✅ 0.11.0 | Dependencies tab; area view with "sort into folders by area"; create and edit areas; run history |
| ✅ 0.10.0 | Check-up ("Durchsicht"); device picker by area → device → function; local test environment |
| ✅ 0.9.0 – 0.9.1 | First public release with ready-made images; AI access (MCP) for folder plans; move several entries at once |
| ✅ 0.8.0 | Tidy-up assistant: "Office - Heating" becomes a real subfolder |
| ✅ 0.7.0 – 0.7.2 | Create and delete automations and scripts |
| ✅ 0.6.0 | Add, move, duplicate, disable and delete blocks |
| ✅ 0.5.0 – 0.5.1 | Edit values in the flow and save to Home Assistant |
| ✅ 0.4.0 | Read-only flow view as sentence blocks |
| ✅ 0.3.0 | Name, icon, area, labels; on/off and run; favorites, notes, folder colors; live updates |
| ✅ 0.2.0 | Create folders and helpers |
| ✅ 0.1.0 | One list for automations, scripts, scenes and helpers with nested folders |

Ideas and wishes are welcome as a GitHub issue.
