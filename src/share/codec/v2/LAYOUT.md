# Share codec v2 — byte layout

Codec version 2 (2026-09-03). It keeps the v1 envelope, primitives, tables, list structure and
every record except the two below; read `../v1/LAYOUT.md` first — its rules apply unchanged, and
the code is shared (`../v1/layout.ts` composes the lists, `records.ts` holds the two v2 records).
**Released layouts are immutable**: never reorder, remove or renumber anything.

## Changed records

```
accessorySet  <v1 accessorySet record>, 5 × id? pieceSourceId (ring1, earring1, necklace, earring2, ring2)
buffs         <v1 buffs record>, count(255) n + n × varint classSkillId
```

- `pieceSourceId` — what a piece is taken from, in wear order: an accessory set (EquipSets.json
  id) or a CW jewel line (the Items.json id of its lowest tier, e.g. "Speedo +1"); the API's id
  space is global, so one varint covers both. `0` means the piece follows the entry's `setId`
  (the streamlined, unmixed case). For a CW jewel the v1 record's per-piece upgrade byte is the
  tier ("+1"…"+5"). Semantic checks (known source, line of the right slot, tier in range,
  necklace variant available on that set) are `validateBuild`'s job.
- `classSkillId` — Skills.json ids of the character's active class buffs, self-buffs and
  passives. `validateBuild` drops ids that are not class skills of the build's job.

## Reading v1 codes

A v1 body decodes with `pieceSourceId = 0` for every piece and no class skills, which is exactly
what such a build meant when it was shared.
