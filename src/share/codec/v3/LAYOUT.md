# Share codec v3 — byte layout

Codec version 3 (2026-09-05). It keeps the v2 body unchanged and appends one list after the swaps;
read `../v1/LAYOUT.md` and `../v2/LAYOUT.md` first — their rules apply unchanged, and the code is
shared (`../v1/layout.ts` composes the lists, `records.ts` holds the new record). **Released
layouts are immutable**: never reorder, remove or renumber anything.

## Body

```
<v2 body>
count(8) pvpTargets,  pvpTarget × n
```

Bytes left after the last target are `CORRUPT`.

## Added record

```
pvpTarget  str name, varint defense, varint magicDefense,
           scaled(0.1) magicResistance, scaled(0.1) criticalResist,
           scaled(0.1) pvpDamageReduction, scaled(0.1) incomingDamage
```

- A custom PvP target of the damage rows: a defender's six character-window numbers. `defense`
  and `magicDefense` are before the game's PvP factor (the engine applies it); the four
  percentages are the target's own totals, `incomingDamage` normally negative.
- Targets get ids after the swaps, in encounter order, like every other list.
- Range checks (the game's caps: reductions at 50, incoming damage at −50, resistances at 100)
  and a blank name are `validateBuild`'s job and degrade to warnings.

## Reading v1 and v2 codes

A v1 or v2 body decodes with no custom targets, which is exactly what such a build meant when it
was shared: only the built-in presets existed.
