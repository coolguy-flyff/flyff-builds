import { Brand } from '@/components/Brand';
import { Button } from '@/components/Button';

export function FatalError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-text">
      <Brand />
      <h1 className="text-[16px] font-semibold">Something went wrong</h1>
      <p className="max-w-[560px] font-mono text-[12px] break-words text-danger">{message}</p>
      <p className="text-[12px] text-muted">Your build is autosaved — reloading restores it.</p>
      <Button
        variant="primary"
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload
      </Button>
    </main>
  );
}
