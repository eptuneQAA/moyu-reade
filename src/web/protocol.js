export function protocolPath(raw) {
  if (!raw) return '/';

  let url;
  try {
    url = new URL(raw);
  } catch {
    return '/';
  }
  if (url.protocol !== 'moyu:') return '/';

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (host === 'shelf' || host === 'library' || host === '') {
    if (host === '' && segments[0] === 'read' && segments[1]) {
      return idPath(segments[1]);
    }
    return '/';
  }

  if (host === 'read' || host === 'book') {
    return idPath(segments[0]);
  }

  return '/';
}

function idPath(rawId) {
  const id = String(rawId || '').toLowerCase();
  return /^[0-9a-f]{40}$/.test(id) ? `/#/read/${id}` : '/';
}
