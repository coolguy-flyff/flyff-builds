import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';

const GITHUB_URL = 'https://github.com/coolguy-flyff/flyff-builds';
const LICENSE_URL = `${GITHUB_URL}/blob/main/LICENSE`;
const ISSUES_URL = `${GITHUB_URL}/issues`;
const OFFICIAL_URL = 'https://universe.flyff.com';
const API_URL = 'https://api.flyff.com';
const FLYFFULATOR_URL = 'https://github.com/Frostiae/Flyffulator';
const GPL_URL = 'https://www.gnu.org/licenses/gpl-3.0.html';

export interface LegalDialogProps {
  open: boolean;
  /** Bundled game-data version (api.flyff.com /version/data), when the manifest records one. */
  dataVersion: number | undefined;
  onClose: () => void;
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
    >
      {children}
    </a>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2 text-[12px] leading-relaxed text-text-2">{children}</div>
    </section>
  );
}

/**
 * The footer's legal disclaimer: affiliation, trademarks, data sources, attribution, license,
 * warranty and privacy. Purely presentational so it can be rendered without the store.
 */
export function LegalDialog({ open, dataVersion, onClose }: LegalDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Legal disclaimer"
      description="Who made Flyff Builds, where its data and formulas come from, and what it is not."
      width="lg"
    >
      <div className="-mr-2 flex max-h-[min(65vh,640px)] flex-col gap-5 overflow-y-auto pr-2">
        <LegalSection title="Fan community project">
          <p>
            Flyff Builds is an independent, non-commercial fan community project made by coolguy
            (Discord: c.o.o.l.g.u.y). It is not affiliated with, endorsed by, sponsored by or
            otherwise connected to Gala Lab Inc. or any of its subsidiaries, partners or publishers.
          </p>
          <p>
            For the official game, visit{' '}
            <LegalLink href={OFFICIAL_URL}>universe.flyff.com</LegalLink>.
          </p>
        </LegalSection>

        <LegalSection title="Trademarks and game assets">
          <p>
            Flyff, Flyff Universe and all related names, logos, characters, items, artwork and other
            game content are the property of Gala Lab Inc. All game assets shown here (icons, names,
            descriptions, class and skill images) remain the property of their respective owners and
            are used for identification and informational purposes only. No claim of ownership is
            made over any of them.
          </p>
          <p>
            Rights holders who want something changed or removed can{' '}
            <LegalLink href={ISSUES_URL}>open an issue on GitHub</LegalLink> or reach the author on
            Discord.
          </p>
        </LegalSection>

        <LegalSection title="Game data">
          <p>
            Items, equipment sets, classes, skills, awakenings and pets come from the official Flyff
            Universe API at <LegalLink href={API_URL}>api.flyff.com</LegalLink>, which also serves
            the item, class and skill images. Flyff Builds ships a snapshot of that data rather than
            querying the API live
            {dataVersion !== undefined && ` (currently data version ${dataVersion})`}. Balance
            changes made after the snapshot are not reflected until the data is refreshed, so
            confirm anything important in game.
          </p>
        </LegalSection>

        <LegalSection title="Formulas and attribution">
          <p>
            Stat formulas are adapted from <LegalLink href={FLYFFULATOR_URL}>Flyffulator</LegalLink>{' '}
            by Frostiae and contributors, released under the GNU General Public License v3.0. The
            data scraper and the pet tier and Flyff World Championship badge images also come from
            that project. Where Flyff Builds deliberately departs from Flyffulator, the README says
            so.
          </p>
        </LegalSection>

        <LegalSection title="License and source code">
          <p>
            Flyff Builds is free and open-source software released under the{' '}
            <LegalLink href={GPL_URL}>GPL-3.0</LegalLink>. You may use, study, share and modify it
            under the terms of that license.
          </p>
          <p>
            The <LegalLink href={GITHUB_URL}>source code</LegalLink>, the{' '}
            <LegalLink href={LICENSE_URL}>full license text</LegalLink> and the issue tracker are on
            GitHub. Bug reports and pull requests are welcome.
          </p>
        </LegalSection>

        <LegalSection title="No warranty">
          <p>
            Flyff Builds is provided “as is”, without warranty of any kind, express or implied.
            Every number it shows is an estimate produced by community-derived formulas and may
            differ from the live game. Use it as a planning aid, not as an authority; the author is
            not responsible for in-game decisions made on the strength of its output.
          </p>
        </LegalSection>

        <LegalSection title="Privacy">
          <p>
            Flyff Builds has no accounts and no server of its own. Your working build, snapshots and
            last-visited tab live only in your browser’s local storage and never leave your device
            unless you share them: a share link or code contains the build itself, so anyone holding
            it can open the build.
          </p>
          <p>
            The site is hosted on Cloudflare Pages and uses Cloudflare Web Analytics, which counts
            visits in aggregate (page, referrer, browser, country and load performance) without
            cookies, local storage or fingerprinting, so individual visitors are not identified.
            Beyond that, the only third-party requests the app makes are for game images from
            api.flyff.com and for fonts from Google Fonts, each covered by its provider’s own
            privacy policy.
          </p>
        </LegalSection>
      </div>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </AppDialog>
  );
}
