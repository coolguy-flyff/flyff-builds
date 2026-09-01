/**
 * Premium consumables offered as quick toggles on the Buffs tab (plan A3.1 / A6, curated list
 * revised 2026-09-01), in display order. Every id must exist in the bundled item data — asserted
 * by the unit test — so editing this list is the only step needed to change the quick toggles.
 */
export const CURATED_POWERUP_IDS: readonly number[] = [
  6049, // Grilled Eel — HP +50%
  8691, // Upcut Stone — Attack ×1.2 (no abilities in the data; applied by the attack formula)
  2551, // Def-Upcut Stone — Def +20%
  1171, // Potion of Recklessness — Crit +10%
  3748, // Concoction of Profuse Bleeding — Crit dmg +10%
  9480, // Potion of Clarity — Casting +10%
  9411, // Rainbow Cotton Candy — All +5
  7197, // White Cotton Candy — Casting +5%
  2265, // Flask of the Tiger — STR +20
  5080, // Flask of the Lion — STA +20
  1766, // Flask of the Rabbit — DEX +20
  9403, // Flask of the Fox — INT +20
  13803, // Christmas Cookie — Attack +10%, Def +10%, All +10
  10918, // Champion's Bounty Flask (30 Days) — All +10, Speed +10%, Attack +10%, Def +10%
  4863, // Super Charged Power Scroll — HP +600, Attack +300
  4181, // Flyff Balloon — HP +200
];
