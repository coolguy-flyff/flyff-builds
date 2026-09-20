import { useState } from 'react';

import { useGameData } from '@/state';

import { LegalDialog } from './LegalDialog';

const SEPARATOR = ' · ';

/** Site footer: one line with the author, data version and a button opening the legal disclaimer. */
export function AppFooter() {
  const data = useGameData();
  const { dataVersion } = data.manifest;
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <footer className="px-4 pb-6 max-md:pb-24 md:px-6">
      <p className="mx-auto w-full max-w-[1400px] border-t border-white/5 pt-4 text-center text-[11px] leading-relaxed text-dim">
        Made by coolguy (Discord: c.o.o.l.g.u.y)
        {dataVersion !== undefined && `${SEPARATOR}Data version: ${dataVersion}`}
        {SEPARATOR}Fan community project{SEPARATOR}
        <button
          type="button"
          onClick={() => {
            setLegalOpen(true);
          }}
          className="text-muted underline decoration-white/20 underline-offset-2 transition-colors hover:text-accent"
        >
          Legal disclaimer
        </button>
      </p>
      <LegalDialog
        open={legalOpen}
        dataVersion={dataVersion}
        onClose={() => {
          setLegalOpen(false);
        }}
      />
    </footer>
  );
}
