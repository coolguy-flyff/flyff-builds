import { useGameData } from '@/state';

const GITHUB_URL = 'https://github.com/coolguy-flyff/flyff-builds';
const OFFICIAL_URL = 'https://universe.flyff.com';
const FLYFFULATOR_URL = 'https://github.com/Frostiae/Flyffulator';

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-muted underline decoration-white/20 underline-offset-2 transition-colors hover:text-accent"
    >
      {children}
    </a>
  );
}

/** Site footer: author, source, data version and the Gala Lab / Flyffulator attributions. */
export function AppFooter() {
  const data = useGameData();
  const { dataVersion } = data.manifest;

  return (
    <footer className="px-4 pb-6 max-md:pb-24 md:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1.5 border-t border-white/5 pt-4 text-center text-[11px] leading-relaxed text-dim">
        <p>
          Made by coolguy (Discord: c.o.o.l.g.u.y) ·{' '}
          <FooterLink href={GITHUB_URL}>Source code</FooterLink>
          {dataVersion !== undefined && ` · Data version: ${dataVersion}`}
        </p>
        <p>
          Fan community project, not affiliated with or endorsed by Gala Lab Inc.{' '}
          <FooterLink href={OFFICIAL_URL}>Official site</FooterLink>
        </p>
        <p>
          Flyff Universe and all related names, logos, and artwork are property of Gala Lab Inc. All
          game assets (icons, names, descriptions) remain the property of their respective owners
          and are used here for informational purposes only.
        </p>
        <p>
          Game data from the official Flyff Universe API. Stat formulas adapted from{' '}
          <FooterLink href={FLYFFULATOR_URL}>Flyffulator</FooterLink> by Frostiae and contributors
          (GPL-3.0).
        </p>
      </div>
    </footer>
  );
}
