import {
  getStatName,
  STAT_KEYS,
  type Ability,
  type ArmorSet,
  type GameData,
  type SetBonus,
  type Sex,
  type SlimItem,
  type StatKey,
} from '@/data';
import { armorSetShortName, formatAbility, formatStatValue, shortStatLabel } from '@/domain/build';
import { roundTo } from '@/lib/math';

/**
 * Display formatting shared by the gear editors and list rows. Everything here is a pure function
 * of game data; the rules (what is allowed) live in `domain/rules`.
 */

export const SEGMENT_SEPARATOR = ' · ';

export function joinSegments(segments: readonly (string | null | undefined)[]): string {
  return segments
    .filter((segment): segment is string => typeof segment === 'string' && segment !== '')
    .join(SEGMENT_SEPARATOR);
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "+10" */
export function formatUpgrade(level: number): string {
  return `+${level}`;
}

/** Upgrade stepper quick picks (plan A2.1). */
export const UPGRADE_QUICK_PICKS: readonly number[] = [0, 5, 8, 10];

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Narrows a select value to a base stat key (`null` for "none" or unknown). */
export function asStatKey(value: string): StatKey | null {
  const keys: readonly string[] = STAT_KEYS;

  return keys.includes(value) ? (value as StatKey) : null;
}

/** "Attack +17–22%" for ranged abilities ("Incoming Damage −6–10%" for reductions), "HP +28%" otherwise. */
export function formatAbilityLine(data: GameData, ability: Ability): string {
  let line: string;

  if (ability.addMax !== undefined && ability.addMax !== ability.add) {
    const unit = ability.rate ? '%' : '';
    const sign = ability.add < 0 ? '−' : '+';
    const from = Math.abs(roundTo(ability.add, 2));
    const to = Math.abs(roundTo(ability.addMax, 2));
    line = `${shortStatLabel(data, ability.parameter)} ${sign}${from}–${to}${unit}`;
  } else {
    line = formatAbility(data, ability.parameter, ability.add, ability.rate);
  }

  return line;
}

export function formatAbilityList(
  data: GameData,
  abilities: readonly Ability[] | undefined,
): string {
  return (abilities ?? [])
    .map((ability) => formatAbilityLine(data, ability))
    .join(SEGMENT_SEPARATOR);
}

/** "STR +12 · STA +8" from a per-stat total map. */
export function formatStatTotals(totals: Partial<Record<StatKey, number>>): string[] {
  return Object.entries(totals).map(
    ([stat, value]) => `${stat.toUpperCase()} ${formatStatValue(value, false)}`,
  );
}

/** Stat name plus a "%" marker for rate stats, e.g. "Critical Chance %". */
export function statOptionLabel(data: GameData, parameter: string, rate: boolean): string {
  return `${getStatName(data, parameter)}${rate ? ' %' : ''}`;
}

/** Marks skill-damage awakes stored under a `skill:<id>` pseudo-parameter. */
export const SKILL_AWAKE_PREFIX = 'skill:';

export function isSkillDamageAwake(parameter: string): boolean {
  return parameter.startsWith(SKILL_AWAKE_PREFIX);
}

/** "Sonic Blade dmg %" for skill-damage awakes, the stat label otherwise. */
export function skillAwakeParameterLabel(data: GameData, parameter: string): string {
  let label: string;

  if (isSkillDamageAwake(parameter)) {
    const id = Number(parameter.slice(SKILL_AWAKE_PREFIX.length));
    const skill = data.awakeSkills.get(id);
    label = skill === undefined ? parameter : `${skill.name} dmg %`;
  } else {
    label = statOptionLabel(data, parameter, true);
  }

  return label;
}

export function handLabel(item: SlimItem): string {
  return item.twoHanded === true ? '2H' : '1H';
}

/** "Stick (2H)" — the weapon picker group and meta line. */
export function weaponTypeLabel(item: SlimItem): string {
  return `${capitalize(item.subcategory ?? item.category)} (${handLabel(item)})`;
}

function rangeLabel(
  prefix: string,
  min: number | undefined,
  max: number | undefined,
): string | null {
  let label: string | null = null;

  if (min !== undefined && max !== undefined) {
    label = `${prefix} ${min}–${max}`;
  }

  return label;
}

export function attackLabel(item: SlimItem): string | null {
  return rangeLabel('ATK', item.minAttack, item.maxAttack);
}

export function defenseLabel(item: SlimItem): string | null {
  return rangeLabel('DEF', item.minDefense, item.maxDefense);
}

/** "Lv 185 · Stick (2H) · ATK 486–488" */
export function weaponMetaLine(item: SlimItem): string {
  return joinSegments([`Lv ${item.level}`, weaponTypeLabel(item), attackLabel(item)]);
}

/** "Lv 175 · Shield · DEF 759–761" */
export function shieldMetaLine(item: SlimItem): string {
  return joinSegments([`Lv ${item.level}`, 'Shield', defenseLabel(item)]);
}

function presentTags(tags: readonly (string | null)[]): string[] {
  return tags.filter((tag): tag is string => tag !== null);
}

/** Option-row tags for a weapon: level, hand, attack. */
export function weaponRowMeta(item: SlimItem): string[] {
  return presentTags([`Lv ${item.level}`, handLabel(item), attackLabel(item)]);
}

/** Option-row tags for a shield: level, defense. */
export function shieldRowMeta(item: SlimItem): string[] {
  return presentTags([`Lv ${item.level}`, defenseLabel(item)]);
}

/** Search text for item pickers: the name plus every ability's long and short stat name. */
export function itemSearchText(data: GameData, item: SlimItem): string {
  const stats = (item.abilities ?? []).map(
    (ability) =>
      `${getStatName(data, ability.parameter)} ${shortStatLabel(data, ability.parameter)}`,
  );

  return [item.name, ...stats].join(' ');
}

export function sexTag(sex: Sex): string {
  return sex === 'female' ? 'F' : 'M';
}

/** "Golden Etranar (F)" */
export function armorSetLabel(set: ArmorSet): string {
  return `${armorSetShortName(set.name)} (${sexTag(set.sex)})`;
}

/** Picker group for an armor set: "Lv175", "Lv180", "Primordial" or "2026 FWC Golden". */
export function armorSetTier(set: ArmorSet): string {
  let tier = `Lv${set.level}`;

  if (set.name.startsWith('2026 FWC Golden')) {
    tier = '2026 FWC Golden';
  } else if (set.name.startsWith('Primordial')) {
    tier = 'Primordial';
  }

  return tier;
}

function byEquippedDesc(a: SetBonus, b: SetBonus): number {
  return b.equipped - a.equipped;
}

/** Sums abilities per parameter (first-appearance order): three "PvE red" tiers become one +30%. */
export function mergeAbilities(abilities: readonly Ability[]): Ability[] {
  const merged = new Map<string, Ability>();

  for (const ability of abilities) {
    const key = `${ability.parameter}:${ability.rate}`;
    const existing = merged.get(key);

    if (existing === undefined) {
      merged.set(key, { ...ability });
    } else {
      existing.add += ability.add;
    }
  }

  return [...merged.values()];
}

/** The full-set bonus with every tier merged per stat (all tiers apply with all pieces worn). */
export function formatSetBonusLines(data: GameData, bonus: readonly SetBonus[]): string {
  const lines = [...bonus].sort(byEquippedDesc).map((line) => line.ability);

  return mergeAbilities(lines)
    .map((ability) => formatAbilityLine(data, ability))
    .join(SEGMENT_SEPARATOR);
}

/** Bonus lines grouped by tier: "5-pc: M.Atk +5% · Cast Speed +10% · 4-pc: MP recovery +500". */
export function formatSetBonusByTier(data: GameData, bonus: readonly SetBonus[]): string {
  const tiers = new Map<number, string[]>();

  for (const line of [...bonus].sort(byEquippedDesc)) {
    const lines = tiers.get(line.equipped) ?? [];
    lines.push(formatAbilityLine(data, line.ability));
    tiers.set(line.equipped, lines);
  }

  return [...tiers.entries()]
    .map(([equipped, lines]) => `${equipped}-pc: ${lines.join(SEGMENT_SEPARATOR)}`)
    .join(SEGMENT_SEPARATOR);
}

/** Abilities an accessory grants at an upgrade level (`upgradeLevels[u]`, as the engine reads them). */
export function accessoryAbilitiesAt(item: SlimItem, upgrade: number): readonly Ability[] {
  return item.upgradeLevels?.[upgrade]?.abilities ?? item.abilities ?? [];
}

/** "Ring: INT · Magic Attack %" — the stat signature of a set's ring. */
export function ringSignature(data: GameData, ring: SlimItem | undefined): string {
  let signature = 'Ring';

  if (ring !== undefined) {
    const stats = accessoryAbilitiesAt(ring, 0).map((ability) =>
      statOptionLabel(data, ability.parameter, ability.rate),
    );
    signature = `Ring: ${stats.join(SEGMENT_SEPARATOR)}`;
  }

  return signature;
}
