import { useEffect, useState } from 'react';

// Some builds store photos somewhere an <img> can't read directly (e.g.
// SharePoint). They register a resolver that turns the stored reference
// into a viewable address; plain web addresses are used as-is.
let resolver = null;
export const setImageResolver = fn => { resolver = fn; };

const needsResolving = url => !!url && url.startsWith('sp:');

export function useResolvedSrc(url) {
  const [src, setSrc] = useState(() => (needsResolving(url) ? null : url || null));
  useEffect(() => {
    if (!needsResolving(url)) { setSrc(url || null); return undefined; }
    if (!resolver) { setSrc(null); return undefined; }
    let cancelled = false;
    resolver(url).then(u => { if (!cancelled) setSrc(u); }).catch(() => {});
    return () => { cancelled = true; };
  }, [url]);
  return src;
}
