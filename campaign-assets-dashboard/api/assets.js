import crypto from 'node:crypto';
import { isAdmin, publicView } from '../lib/auth.js';
import { readAll, writeAll } from '../lib/store.js';
import { send, body } from '../lib/http.js';

const TYPES = ['Landing page', 'Article', 'Social post', 'Press release', 'Banner', 'Video', 'Email', 'Other'];
const STATUSES = ['Live', 'Scheduled', 'Draft', 'Archived'];

const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);

function clean(input) {
  const url = str(input.url, 2000);
  let ok = false;
  try { ok = ['http:', 'https:'].includes(new URL(url).protocol); } catch {}
  if (!ok) throw new Error('Please enter a valid public link starting with http:// or https://');
  const title = str(input.title, 200);
  if (!title) throw new Error('Title is required');
  return {
    title,
    url,
    type: TYPES.includes(input.type) ? input.type : 'Other',
    status: STATUSES.includes(input.status) ? input.status : 'Live',
    campaign: str(input.campaign, 120),
    channel: str(input.channel, 120),
    market: str(input.market, 120),
    publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(input.publishedAt || '') ? input.publishedAt : '',
    notes: str(input.notes, 1000),
  };
}

export default async function handler(req, res) {
  const admin = isAdmin(req);
  try {
    if (req.method === 'GET') {
      if (!admin && !publicView()) return send(res, 401, { error: 'Login required' });
      const items = await readAll();
      items.sort((a, b) => (b.publishedAt || b.createdAt || '').localeCompare(a.publishedAt || a.createdAt || ''));
      return send(res, 200, { items, types: TYPES, statuses: STATUSES });
    }

    if (!admin) return send(res, 401, { error: 'Admin login required' });
    const data = await body(req);
    const items = await readAll();
    const now = new Date().toISOString();

    if (req.method === 'POST') {
      const item = { id: crypto.randomUUID(), ...clean(data), createdAt: now, updatedAt: now };
      items.push(item);
      await writeAll(items);
      return send(res, 201, { item });
    }

    if (req.method === 'PUT') {
      const i = items.findIndex((x) => x.id === data.id);
      if (i < 0) return send(res, 404, { error: 'Not found' });
      items[i] = { ...items[i], ...clean(data), updatedAt: now };
      await writeAll(items);
      return send(res, 200, { item: items[i] });
    }

    if (req.method === 'DELETE') {
      const id = data.id || new URL(req.url, 'http://x').searchParams.get('id');
      const next = items.filter((x) => x.id !== id);
      if (next.length === items.length) return send(res, 404, { error: 'Not found' });
      await writeAll(next);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    const status = /valid|required/i.test(e.message) ? 400 : 500;
    return send(res, status, { error: e.message });
  }
}
