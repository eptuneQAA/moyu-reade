import { useEffect, useState } from 'react';
import Bookshelf from './Bookshelf';
import Reader from './Reader';
import { loadSettings, saveSettings } from './settings';
import type { ReaderSettings } from './types';

type Route = { name: 'shelf' } | { name: 'reader'; id: string };

function protocolId(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'moyu:') return null;
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    const candidate =
      host === 'read' || host === 'book'
        ? segments[0]
        : host === '' && segments[0] === 'read'
          ? segments[1]
          : null;
    return candidate && /^[0-9a-f]{40}$/i.test(candidate)
      ? candidate.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#/, '');
  const match = raw.match(/^\/read\/([0-9a-f]{40})/);
  return match ? { name: 'reader', id: match[1] } : { name: 'shelf' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [settings, setSettings] = useState<ReaderSettings>(loadSettings);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('moyu');
    if (!raw) return;
    const id = protocolId(raw);
    window.location.replace(id ? `/#/read/${id}` : '/');
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  const openBook = (id: string) => {
    window.location.hash = `/read/${id}`;
  };

  const backToShelf = () => {
    window.location.hash = '';
  };

  if (route.name === 'reader') {
    return (
      <Reader
        key={route.id}
        id={route.id}
        onBack={backToShelf}
        settings={settings}
        onSettingsChange={setSettings}
      />
    );
  }

  return <Bookshelf onOpen={openBook} />;
}
