# Icons and icon packs

HA icons are strings "pack:name": `mdi:lamp` is one of HA's standard icons (Material Design Icons),
`phu:wallbox` comes from an icon pack installed through HACS (custom-brand-icons, hass-hue-icons …).
HomeAce Studio shows both wherever an entry, label or area has its own icon, and offers an icon search
for entries and labels. Areas keep their fixed choice in the area dialog but show pack icons.

## Where what lives

| What | Where |
| --- | --- |
| Show an icon (standard via the font, pack icon as SVG, else a fallback) | `frontend/src/components/common/AppIcon.vue` |
| Icon field: preview, text input, "Auswählen …", note | `frontend/src/components/icons/IconField.vue` |
| Icon search: grid, filters per pack, selection line | `frontend/src/components/icons/IconPicker.vue` |
| Find and load packs, paths per icon, names per pack | `frontend/src/stores/iconPacksStore.ts` |
| HA's page, `customIcons`, loading pack scripts | `frontend/src/services/iconPacksService.ts` |
| Parse "pack:name", standard icon names, search | `frontend/src/utils/haIcon.ts` |
| Dashboard resources that look like icon packs | `backend/src/lookups/icon-resources.ts`, `GET /api/icon-packs/resources` |

## Standard icons

The names come from the MDI font stylesheet the app already loads (`.mdi-lamp::before` per icon,
`mdiNamesFromStyleSheets`), so there is no list of our own and it always matches the font: about 7,450
icons. Names are English, like in HA's own icon picker; the search says so when nothing is found.

## Icon packs

Packs register in HA's frontend as `window.customIcons[prefix] = { getIcon(name), getIconList() }`.
This is not an official HA API (🔴 row in [../ha-compatibility.md](../ha-compatibility.md)).

1. **Opened from the sidebar**, HomeAce Studio runs in an iframe of HA's page on the same origin, so it
   reads `window.parent.customIcons` (`haWindow` checks for the `home-assistant` element). Also its own
   `window.customIcons` counts.
2. **HA loads dashboard resources only once a dashboard was open** (found on the owner's HA: right after
   a reload, HA's own settings had no `phu:` icons either). When no pack is there, HomeAce Studio asks
   `GET /api/icon-packs/resources` and imports those scripts into its own window. Only scripts whose file
   name says "icon" are listed, so cards (Mushroom …) never run in HomeAce Studio.
3. If such a script exists but no pack appeared, the search shows "Paket-Icons fehlen? Öffne einmal ein
   Dashboard …" (`isPackMissing`). Without any pack resource there is no hint.
4. **Outside HA** (own port, demo) the parent is another origin: no packs, and the search says that pack
   icons come with the sidebar. A saved pack icon then shows the fallback; the field's note says the pack
   is not loaded and that the icon stays saved.

`getIcon` and `getIconList` are someone else's code: every call is wrapped, a failing pack shows the
fallback. Paths are cached per icon (`paths`), so 240 cells or a long list resolve each icon once.

## Icon search

- Opens next to its field and never covers it (`useNoCoverPlacement`); the page behind does not scroll
  while it is open (`usePageScrollLock`, the grid carries `data-own-scroll`).
- One search over pack icons (first) and standard icons; every word must occur. Filters "Alle ·
  Standard · per pack" with counts. At most 240 cells (`ICON_SEARCH_LIMIT`), then "… und N weitere".
- A click selects, double click or Enter applies, "Übernehmen" applies, "Entfernen" goes back to the
  standard icon, "Abbrechen" closes. The same icon again just closes.
- Closes on a click outside (only its own "Auswählen …" button, `data-icon-toggle`, is not outside), on
  Escape (on the panel only, so the label picker around it stays) and when its field scrolls away.
- Inside the label picker the search scrolls nothing: the field sits in a fixed panel, so it opens on
  the side with more room.

## Pitfalls

- `focus({ preventScroll: true })` when a panel opens: a plain focus lets the browser scroll the page
  behind, which closed an open label picker around the icon search.
- Closing on scroll counts only scrolls that move the field (`useCloseWhenFieldScrolls`): a text field
  scrolling its own long text fires scroll events too.
- The demo has no icon pack. For a click test, register one before the app starts:
  `window.customIcons = { demo: { getIcon: async () => ({ path: "M3 3h18v18H3z" }), getIconList: async () => [{ name: "box" }] } }`.
