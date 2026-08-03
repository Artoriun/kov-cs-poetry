import type { Poem } from '@gedichtenv2/shared';

// ponytail: coerce http→https so auth header isn't stripped on Render's 301 redirect
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/^http:\/\//, 'https://');

/**
 * Whether there is an API to talk to at all.
 *
 * Running this as a plain static site is a supported choice — the poems are in the bundle
 * and the prerendered HTML, so the site is complete without a backend. In that case
 * VITE_API_URL is unset and a fetch would resolve against the static host, which can only
 * ever 404: handled fine in JS, but still logged by the browser as a failed request, which
 * is both noise in the console and a Lighthouse best-practices failure.
 *
 * Dev is exempt: there VITE_API_URL is normally unset because Vite proxies /api to the
 * local server instead.
 */
export const HAS_API = import.meta.env.DEV || BASE !== '';

const getToken = () => localStorage.getItem('admin_token');

function handleUnauthorized() {
  localStorage.removeItem('admin_token');
  window.location.reload();
}

export async function apiLogin(password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const { token } = (await res.json()) as { token: string };
  return token;
}

export async function apiGetPoems(): Promise<Poem[]> {
  const res = await fetch(`${BASE}/api/poems`);
  if (!res.ok) throw new Error('Failed to fetch poems');
  return res.json() as Promise<Poem[]>;
}

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot — left empty by real users, filled by naive bots. */
  website?: string;
}

export async function apiSendContact(msg: ContactMessage): Promise<void> {
  // Without a deadline the button sits on "Sending…" indefinitely if the API is slow to
  // wake or the mail server is unreachable. 30s is past a normal send (a few seconds) but
  // well short of giving up on the visitor.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 30_000);
  try {
    const res = await fetch(`${BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
      signal: abort.signal,
    });
    if (!res.ok) {
      // 429 gets its own message; the visitor can act on "wait" but not on "bad gateway".
      throw new Error(res.status === 429 ? 'rate-limited' : 'failed');
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function apiAddPoem(): Promise<Poem> {
  const res = await fetch(`${BASE}/api/poems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to add poem');
  return res.json() as Promise<Poem>;
}

export async function apiUpdatePoem(
  id: string,
  data: {
    title?: string;
    overlay?: string;
    image?: string;
    featured?: boolean;
    deleted?: boolean;
    customSlides?: string[];
    customSlidesEnabled?: boolean;
  },
): Promise<void> {
  const res = await fetch(`${BASE}/api/poems/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(data),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to update poem');
}

export async function apiUploadImage(id: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE}/api/poems/${id}/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to upload image');
  const { url } = (await res.json()) as { url: string };
  return url;
}

export async function apiUpdateOrder(ids: string[]): Promise<void> {
  const res = await fetch(`${BASE}/api/poems/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ ids }),
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to update order');
}

export async function apiResetPoem(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/poems/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to reset poem');
}
