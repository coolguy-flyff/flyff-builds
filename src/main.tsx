import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { bootstrapApp } from '@/app/bootstrap';
import { FatalError } from '@/app/FatalError';
import { createLocalStorage } from '@/persistence';

import '@/styles/tokens.css';

const container = document.getElementById('root');

if (container === null) {
  throw new Error('Root element #root is missing from index.html');
}

const root = createRoot(container);

try {
  const { store, data } = bootstrapApp({
    storage: createLocalStorage(window.localStorage),
    now: () => Date.now(),
    href: window.location.href,
    replaceUrl: (url) => {
      window.history.replaceState(null, '', url);
    },
  });

  root.render(
    <StrictMode>
      <App store={store} data={data} />
    </StrictMode>,
  );
} catch (error) {
  console.error('Flyff Builds failed to start', error);
  root.render(
    <StrictMode>
      <FatalError error={error} />
    </StrictMode>,
  );
}
