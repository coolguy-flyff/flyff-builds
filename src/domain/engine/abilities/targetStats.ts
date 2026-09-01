/**
 * Some parameters feed several stats: `allstats` counts for every base stat, `block` for both
 * block kinds, and so on. Port of the target-stat unions in flyffentity.js:1148-1169.
 */

const UNIONS: readonly { readonly members: readonly string[]; readonly union: string }[] = [
  { members: ['str', 'sta', 'dex', 'int'], union: 'allstats' },
  {
    members: ['earthmastery', 'firemastery', 'watermastery', 'electricitymastery', 'windmastery'],
    union: 'allelementsmastery',
  },
  {
    members: ['earthdefense', 'firedefense', 'waterdefense', 'electricitydefense', 'winddefense'],
    union: 'allelementsdefense',
  },
  { members: ['speed', 'attackspeed', 'decreasedcastingtime'], union: 'allspeed' },
  { members: ['meleeblock', 'rangedblock'], union: 'block' },
];

const TARGETS_BY_PARAMETER: ReadonlyMap<string, readonly string[]> = new Map(
  UNIONS.flatMap(({ members, union }) => members.map((member) => [member, [member, union]])),
);

/** The parameters whose contributions count towards `parameter`, the parameter itself first. */
export function expandTargetStats(parameter: string): readonly string[] {
  return TARGETS_BY_PARAMETER.get(parameter) ?? [parameter];
}
