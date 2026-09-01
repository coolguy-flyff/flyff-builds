# Share codec v1 — byte layout

Normative description of codec version 1. **Released layouts are immutable**: a link shared today
must decode forever. Never reorder, remove or renumber anything below (fields, bit assignments, enum
codes, table entries). An incompatible change is a new version with its own directory and decoder,
selected by the envelope's version byte; old decoders are kept and dispatched forever.

## Envelope (all versions)

```
base64url( u8 version | u8 flags | body )
```

- `version` — `1` for this layout. `0` never existed (`CORRUPT`); anything above the newest known
  version is `UNSUPPORTED_VERSION` ("made with a newer version").
- `flags` — bit 0: the body is raw DEFLATE (RFC 1951, no zlib/gzip framing). Encoders deflate only
  when the result is strictly smaller than the plain body. Bits 1–7 are reserved for future envelope
  features; a decoder that sees one set reports `UNSUPPORTED_VERSION`.
- base64url is the RFC 4648 §5 alphabet without padding, so a code is URL- and hash-safe.
- Size guards: a decoded code above 64 KiB, or an inflated body above 256 KiB, is `LIMIT_EXCEEDED`
  (the layout cannot legitimately reach either).

## Primitives

| Name        | Encoding                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `u8`        | one byte                                                                                       |
| `varint`    | unsigned LEB128, at most 5 bytes (32 bits); longer or larger is `CORRUPT`                      |
| `signed`    | zig-zag mapped (`0, −1, 1, −2, …` → `0, 1, 2, 3, …`) into a `varint`                           |
| `str`       | `varint` UTF-8 byte length, then the bytes; more than 32 UTF-16 code units is `LIMIT_EXCEEDED` |
| `count(n)`  | `u8` list length; above the stated maximum `n` is `LIMIT_EXCEEDED`                             |
| `id?`       | `varint` game id; `0` = none (real ids start at 1, so `0` is never written for a real id)      |
| `scaled(s)` | `signed` of `round(value / s)`; decoded as `n × s` rounded to 4 decimals                       |
| `param`     | `u8` index into `PARAM_TABLE_V1`, or `0xFE` followed by a non-empty `str`                      |
| `param?`    | `param`, or `0xFF` = none                                                                      |
| `flag`      | `u8` holding `0` or `1`; any other value is `CORRUPT`                                          |

## Body

```
varint jobId, u8 level
count(16) pages,          page × n
count(32) equipmentSets,  equipmentSet × n
count(32) weapons,        weapon × n
count(32) shields,        shield × n
count(32) accessorySets,  accessorySet × n
count(32) fashionSets,    fashionSet × n
count(32) pets,           pet × n
buffs
count(16) swaps,          swap × n
```

At least one page and one swap are required; bytes left after the last swap are `CORRUPT`.

### Entries

```
page          str name, 4 × varint (stat − 15) in the order str, sta, dex, int
equipmentSet  str name, id? setId, u8 upgrade, setAwake, stacks suitCards
weapon        str name, id? itemId, u8 upgrade, awake, skillAwake, stacks cards, stacks jewels,
              count(255) n + n × scaled(0.01) statRanges, count(4) n + n × randomLine
shield        str name, id? itemId, u8 upgrade, awake, skillAwake, stacks cards
accessorySet  str name, id? setId, u8 variants, 5 × u8 upgrade (ring1, ring2, earring1, earring2, necklace)
fashionSet    str name, u8 speedPercent, count(10) n + n × blessingLine, id? cloakItemId
pet           str name, id? petItemId, varint total
buffs         flag rmEnabled, count(255) n + n × varint excludedSkillId,
              count(32) n + n × varint premiumItemId,
              count(255) n + n × varint npcId (personal house), same (couple house), same (guild ship),
              id? achievementId
swap          str name, flag includeInResults, u8 page, u8 equipmentSet, u8 accessorySet, u8 weapon,
              u8 offhandKind, u8 offhand, u8 fashionSet, u8 pet, id? maskItemId
```

- `statRanges` hold one value per ranged ability (`add…addMax`) of the item, in ability order — the
  parameter is implied by the item and not written.
- `variants`: bit 0 earring 1 (0 plug / 1 demol), bit 1 earring 2 (same), bits 2–3 necklace (0 gore
  / 1 mental / 2 peision; 3 is `CORRUPT`), bits 4–7 reserved and must be 0.
- Swap slots are **1-based positions in the encoded lists** above (`0` = none; `page` must not be
  0). `offhandKind` is 0 none / 1 shield / 2 weapon; `offhand` must be 0 for kind 0 and a valid
  position in `shields` (kind 1) or `weapons` (kind 2) otherwise. Out-of-range positions are
  `CORRUPT`.

### Composite fields

```
awake         2 × u8, one per line: 0 = empty, else bits 0–1 stat (0 str / 1 sta / 2 dex / 3 int)
              | bits 2–4 value (1..4); anything else is CORRUPT
setAwake      2 × u8 like awake but bits 2–6 carry an overall 1..16 total (equipment sets store
              the awake sum across their four pieces, not a per-piece awake)
skillAwake    param?, then scaled(0.1) value when present
randomLine    param?, then scaled(STEP_V1[param] ?? 1) value when present
blessingLine  param, scaled(0.01) total
stacks        count(255) n + n × (varint itemId, u8 count ≥ 1)
```

## Names and ids

- Entry ids never leave the app. The decoder assigns ids 1..n in encounter order (pages, equipment
  sets, weapons, shields, accessory sets, fashion sets, pets, swaps) and sets `nextId = n + 1`.
- `customName` is written verbatim, or as `''` when absent; `''` decodes to "no custom name".

## Tables (`tables.ts`)

- `PARAM_TABLE_V1` — parameters of random-stat lines, blessings and skill awakes; index = code.
  Append-only. Parameters outside the table travel through the `0xFE` escape, so a data refresh
  never breaks existing links; the test suite fails when the bundle introduces a parameter that is
  not yet in the table (append it, never insert).
- `STEP_V1` — random-stat value steps (`attack`, `criticaldamage`, `criticalchance`, `stealhp`,
  `blockpenetration` 0.1; `attackspeed` 0.05; default 1).
- The stat, earring, necklace, offhand and accessory-piece orders above are frozen copies of the
  domain enums; tests assert they still match.

## Design notes

- **Decoding needs no game data.** Every value is either self-describing or scaled by a frozen
  constant, so a data refresh can only affect the semantic repair step (`validateBuild`), never the
  parse. This is why stat ranges use the fixed `0.01` step instead of the per-parameter step of the
  item's i-th ranged ability, and why blessing totals use `0.01` rather than a step derived from the
  blessing table; the cost is about one byte per integer-valued range.
- **All scaled values are zig-zag signed.** Ranged abilities can be negative (Lusaka's Fist carries
  `incomingdamage −6…−10`); using one signed representation everywhere keeps the field helpers
  uniform for one extra bit per value.
- Values off the step grid are rounded to the grid when encoded; the UI only produces on-grid
  values, and `validateBuild` clamps anything still out of bounds after decoding.
- Item, set, skill, NPC and achievement ids are written as game ids (varints), never as indexes
  into the data tables, so links survive data refreshes; unknown ids degrade to validation warnings.
