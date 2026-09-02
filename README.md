# Flyff Builds

Build-comparison tool for [Flyff Universe](https://universe.flyff.com/): enter gear in
shorthand, keep several alternatives of each gear type, compose them into gear swaps under one
buff configuration, and compare the final stats of every swap side by side.

[Flyffulator](https://github.com/Frostiae/Flyffulator) simulates one fully specified character at
a time. Flyff Builds ports its stat formulas (the game data comes from the official Flyff
Universe API) and flips the workflow:

1. **Shorthand gear** — "Golden Etranar +10, STA +16 awakes, 28% HP cards" instead of four
   armor pieces configured one by one. Cards and jewels are stacks (`card × count`), awakes are
   picked from the valid combinations only, pet totals and blessing totals snap to reachable values.
2. **Alternatives** — any number of equipment sets, weapons, shields, accessory sets, fashion sets,
   raised pets and stat pages live side by side.
3. **Gear swaps** — one pick from each list plus a stat page, under a shared buff configuration
   (max RM buffs, premium items, housing NPCs, FWC achievement).
4. **Results** — one column per swap: base stats, vitals, speed, offense, defense and (for Seraphs)
   Heal Rain / Gloria Patri healing, with best-value highlighting, diff mode and exports.

Everything autosaves to the browser's local storage on every change. "Save as…" keeps immutable
snapshots, "Reset" starts over (after an automatic snapshot), and "Share" produces a compact code
or link (`?b=<code>`) that "Import" previews before replacing the working build.

## Usage

- **Character** — job (8 third jobs), level 165–190, and stat pages (STR/STA/DEX/INT from 15,
  `2 × (level − 1)` points; values are clamped so a page can never go negative by typing).
- **Gear** — six lists with a master–detail editor each. Item pickers search by name or stat
  ("hp" finds Volcano cards). Ability preview shows exactly what the shorthand expands to.
- **Buffs & Swaps** — global buffs on the left, swap cards on the right. A new swap is pre-filled
  with the first entry of every list so results appear immediately.
- **Results** — sticky table, `Diff vs`, only-differing rows, best highlighting, raw stat totals,
  column hiding and TSV / Markdown / CSV export. Footnotes list every degradation applied
  (ignored offhand, excess jewels, …).

Keyboard: steppers accept typing and arrow keys (Shift ±10, Ctrl ±100); lists use ↑/↓ and
Enter; tabs use ←/→; dialogs trap focus and close with Esc. Gear entries, swaps and result
columns reorder by dragging their ⠿ grip (or focus the grip: Space picks up, arrows move, Space
drops).

## Development

```sh
pnpm install
pnpm dev              # http://localhost:5173
pnpm check            # typecheck + lint + format:check + test (must be green before a commit)
pnpm build            # production bundle in dist/
pnpm scrape-data      # refreshes data-src/ from the public api.flyff.com API
pnpm build-data       # regenerates src/data/generated from data-src/
pnpm build-data:check # fails when the generated tables drift from the source
```

`FLYFFULATOR_DATA_DIR` overrides the data source directory (default `data-src/`, refreshed by
the scraper; `Blessings.json` and `Achievements.json` there are curated by hand and never
scraped). The parity test-suite (`src/test/parity`) cross-checks the engine against Flyffulator's
own JavaScript and runs only when a Flyffulator checkout exists at `FLYFFULATOR_DIR` (default
`../Flyffulator`); it is skipped otherwise.

### Architecture

Dependency direction is enforced by ESLint (`eslint-plugin-boundaries`):

```
lib ← data ← config ← domain ← share / persistence ← state ← components / results ← features ← app
```

- `src/data` — slim, zod-validated game tables (generated) and the indexed `GameData`.
- `src/domain` — pure logic: build schema, rules (slots, awakes, random stats, pets, blessings,
  offhand), validation/repair, auto-naming, and the calculation engine that ports Flyffulator's
  formulas (documented quirks included).
- `src/share` — versioned binary share codec (deflate + base64url).
- `src/persistence` — localStorage envelopes, autosave, snapshots.
- `src/state` — zustand store, actions, selectors.
- `src/components` — store-agnostic UI primitives; `src/features` — the tabs and dialogs;
  `src/app` — bootstrap, hash router and shell.

### Not modeled

Element upgrades, damage simulation, party skills, class passives/self-buffs, buff stacking
rules and skill-damage awakes are out of scope. Hit rate and block are computed against
Flyffulator's training dummy. "Max RM buffs" assumes the caster's INT reaches every scaling cap.
The Gloria Patri rows include the Heal synergy with Heal at level 20 (+1000 HP) — a deliberate
addition over Flyffulator, which leaves that synergy as a TODO.

## Attribution & license

Stat formulas are derived from [Flyffulator](https://github.com/Frostiae/Flyffulator) by Frostiae
and contributors, licensed under the GPL-3.0; the data scraper is adapted from the same project,
and the pet tier and FWC badge images under `public/` come from it too. Flyff Builds is therefore
also released under the [GPL-3.0](./LICENSE). Game data comes from the official Flyff Universe
API (api.flyff.com), which also serves the item and class images.
Flyff Builds is a fan community project, not affiliated with or endorsed by Gala Lab Inc.
([official site](https://universe.flyff.com)). Flyff Universe and all related names, logos and
artwork are property of Gala Lab Inc.; all game assets (icons, names, descriptions) remain the
property of their respective owners and are used here for informational purposes only.
