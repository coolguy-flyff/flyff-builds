import { IconSelect, type IconSelectOption } from '@/components/IconSelect';
import { ItemIcon } from '@/components/ItemIcon';
import { SparkleLayer } from '@/components/Sparkles';
import { ToolbarMenu, ToolbarMenuSection, type ToolbarMenuTone } from '@/components/ToolbarMenu';
import { FloatingTooltip } from '@/components/Tooltip';
import { cx } from '@/lib/cx';
import type { PetOverride } from '@/state';

import { SwitchLabel } from './SwitchLabel';
import {
  graceEffectFor,
  isPetOverrideActive,
  NO_PET_VALUE,
  OWN_PET_VALUE,
  parsePetOverride,
  type GraceEffect,
  type OverridePet,
} from './viewState';

export interface PetMenuProps {
  petOverride: PetOverride;
  petGrace: boolean;
  /** The build's pet entries, offered as an override for every swap. */
  pets: readonly OverridePet[];
  /** What the pet grace switch applies (duration, cooldown, energy), for its tooltip. */
  petGraceHint: string;
  onPetOverride: (petOverride: PetOverride) => void;
  onPetGrace: (petGrace: boolean) => void;
}

const GRACE_EFFECT_TEXT: Readonly<Record<Exclude<GraceEffect['kind'], 'effect'>, string>> = {
  varies: 'varies by swap',
  none: 'none',
};

/** Gold while grace applies, tinted while a pet is overridden, plain otherwise. */
function petMenuTone(overridden: boolean, graceApplied: boolean): ToolbarMenuTone {
  let tone: ToolbarMenuTone = 'plain';

  if (graceApplied) {
    tone = 'golden';
  } else if (overridden) {
    tone = 'active';
  }

  return tone;
}

function graceEffectText(effect: GraceEffect): string {
  return effect.kind === 'effect' ? effect.text : GRACE_EFFECT_TEXT[effect.kind];
}

/** "Grace effect: STR +10 · …" — dimmed while grace is off, lit and glittering while it applies. */
function GraceEffectLine({ effect, lit }: { effect: GraceEffect; lit: boolean }) {
  return (
    <p
      className={cx(
        'relative rounded-control px-2.5 py-1.5 text-[11px] transition-colors',
        lit ? 'bg-sparkle/8 text-sparkle' : 'text-dim',
      )}
    >
      {lit && <SparkleLayer />}
      <span className={lit ? 'text-sparkle/70' : undefined}>Grace effect:</span>{' '}
      <span className="font-mono">{graceEffectText(effect)}</span>
    </p>
  );
}

/**
 * The pet what-ifs (Results only, never the build): which pet every swap wears and whether its
 * grace applies. The button is tinted while a pet is overridden and turns gold and glitters while
 * grace applies.
 */
export function PetMenu({
  petOverride,
  petGrace,
  pets,
  petGraceHint,
  onPetOverride,
  onPetGrace,
}: PetMenuProps) {
  const options: IconSelectOption[] = [
    { value: OWN_PET_VALUE, label: "— each swap's own —" },
    { value: NO_PET_VALUE, label: 'None' },
    ...pets.map((pet) => ({
      value: String(pet.id),
      label: pet.name,
      icon: pet.icon === null ? undefined : <ItemIcon icon={pet.icon} size={22} />,
      detail: pet.stat ?? undefined,
    })),
  ];
  const overridden = isPetOverrideActive(petOverride, pets);
  const graceEffect = graceEffectFor(petOverride, pets);
  const graceAvailable = graceEffect.kind !== 'none';
  const graceApplied = petGrace && graceAvailable;

  return (
    <ToolbarMenu
      label="Raised pet"
      tone={petMenuTone(overridden, graceApplied)}
      panelClassName="w-[400px] max-w-[calc(100vw-24px)]"
    >
      <ToolbarMenuSection title="Pet" note="applies to every swap">
        <div className="flex items-center gap-3.5">
          <span className="min-w-0 flex-1">
            <IconSelect
              label="Pet for every swap"
              value={overridden ? String(petOverride) : OWN_PET_VALUE}
              options={options}
              onChange={(value) => {
                onPetOverride(parsePetOverride(value));
              }}
            />
          </span>
          {/* Portal tooltip: an in-flow one would widen the panel, which scrolls its overflow. */}
          <FloatingTooltip content={petGraceHint}>
            <SwitchLabel
              label="Pet grace"
              checked={graceApplied}
              disabled={!graceAvailable}
              onChange={onPetGrace}
            />
          </FloatingTooltip>
        </div>
        <GraceEffectLine effect={graceEffect} lit={graceApplied} />
      </ToolbarMenuSection>
    </ToolbarMenu>
  );
}
