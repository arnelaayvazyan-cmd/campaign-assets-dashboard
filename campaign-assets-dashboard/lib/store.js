// Storage: Upstash Redis (REST) in production, a local JSON file in development.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const KEY = 'sb:campaign-assets';
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LOCAL_FILE = path.join(process.cwd(), '.data', 'assets.json');

async function redis(command) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || `Redis error ${r.status}`);
  return data.result;
}

export function storageMode() {
  return URL_ && TOKEN ? 'redis' : 'local-file';
}

export async function readAll() {
  if (storageMode() === 'redis') {
    const raw = await redis(['GET', KEY]);
    return raw ? JSON.parse(raw) : [];
  }
  if (process.env.VERCEL) {
    throw new Error('Storage not configured. Connect Upstash Redis in Vercel → Storage, then redeploy.');
  }
  try { return JSON.parse(await fs.readFile(LOCAL_FILE, 'utf8')); } catch { return []; }
}

export async function writeAll(items) {
  if (storageMode() === 'redis') { await redis(['SET', KEY, JSON.stringify(items)]); return; }
  if (process.env.VERCEL) {
    throw new Error('Storage not configured. Connect Upstash Redis in Vercel → Storage, then redeploy.');
  }
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(items, null, 2));
}
