# Share codec v4 — byte layout

Codec version 4 (2026-09-22). It keeps the v3 body and changes one record; read `../v1/LAYOUT.md`,
`../v2/LAYOUT.md` and `../v3/LAYOUT.md` first — their rules apply unchanged, and the code is
shared (`../v1/layout.ts` composes the lists, `records.ts` holds the changed record). **Released
layouts are immutable**: never reorder, remove or renumber anything.

## Changed record

```
buffs  <v2 buffs record>, count(255) n + n × varint coupleSkillId
```

- `coupleSkillId` — Skills.json ids of the active couple skills (Stamina Boost, Madrigal Stroll,
  …; the list comes from the API's `/couple`). `validateBuild` drops ids that are not bundled
  couple skills.

## Reading v1–v3 codes

Earlier bodies decode with no couple skills, which is exactly what such a build meant when it was
shared: the app had none.
