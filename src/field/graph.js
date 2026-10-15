// Small Microsoft Graph client.
import { getToken } from '@/field/auth';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export async function graph(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await getToken();
  const isJson = body !== undefined && !(body instanceof Blob);
  const res = await fetch(path.startsWith('http') ? path : `${GRAPH}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: isJson ? JSON.stringify(body) : body,
  });
  if (!res.ok) {
    let message = '';
    try { message = (await res.json()).error?.message || ''; } catch { /* not JSON */ }
    const err = new Error(message || `Microsoft 365 returned ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

// Follows paging so long lists come back complete.
export async function graphAll(path, options) {
  const out = [];
  let next = path;
  while (next) {
    const page = await graph(next, options);
    out.push(...(page.value || []));
    next = page['@odata.nextLink'];
  }
  return out;
}
