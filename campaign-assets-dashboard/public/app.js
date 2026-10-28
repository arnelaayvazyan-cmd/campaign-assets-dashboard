const $ = (s) => document.querySelector(s);
const state = { items: [], types: [], statuses: [], admin: false, publicView: true };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

async function api(path, opts = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: r.status });
  return data;
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
}
function notice(msg) { const n = $('#notice'); n.textContent = msg || ''; n.classList.toggle('hidden', !msg); }

async function load() {
  const me = await api('/api/me');
  Object.assign(state, { admin: me.admin, publicView: me.publicView });
  $('#addBtn').classList.toggle('hidden', !me.admin);
  $('#logoutBtn').classList.toggle('hidden', !me.admin);
  $('#loginBtn').classList.toggle('hidden', me.admin);
  try {
    const data = await api('/api/assets');
    Object.assign(state, data);
    notice('');
  } catch (e) {
    state.items = [];
    notice(e.status === 401 ? 'This dashboard is private. Log in to view the assets.' : e.message);
  }
  fillSelects();
  render();
}

function opts(sel, values, keepFirst = true) {
  const el = $(sel); const cur = el.value;
  const first = keepFirst ? el.options[0].outerHTML : '';
  el.innerHTML = first + values.map((v) => `<option>${esc(v)}</option>`).join('');
  if ([...el.options].some((o) => o.value === cur)) el.value = cur;
}
const uniq = (k) => [...new Set(state.items.map((i) => i[k]).filter(Boolean))].sort();

function fillSelects() {
  opts('#fCampaign', uniq('campaign'));
  opts('#fType', state.types);
  opts('#fStatus', state.statuses);
  opts('#assetForm [name=type]', state.types, false);
  opts('#assetForm [name=status]', state.statuses, false);
  $('#campaignList').innerHTML = uniq('campaign').map((v) => `<option value="${esc(v)}">`).join('');
  $('#channelList').innerHTML = uniq('channel').map((v) => `<option value="${esc(v)}">`).join('');
}

function filtered() {
  const q = $('#q').value.trim().toLowerCase();
  const c = $('#fCampaign').value, t = $('#fType').value, s = $('#fStatus').value;
  return state.items.filter((i) =>
    (!c || i.campaign === c) && (!t || i.type === t) && (!s || i.status === s) &&
    (!q || [i.title, i.channel, i.campaign, i.market, i.notes, i.url].join(' ').toLowerCase().includes(q)));
}

function render() {
  const list = filtered();
  const count = (t) => list.filter((i) => i.type === t).length;
  $('#stats').innerHTML = [
    ['Total assets', list.length],
    ['Campaigns', new Set(list.map((i) => i.campaign).filter(Boolean)).size],
    ['Landing pages', count('Landing page')],
    ['Articles', count('Article') + count('Press release')],
    ['Social posts', count('Social post')],
  ].map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');

  $('#grid').innerHTML = list.map((i) => `
    <article class="card">
      <div class="card-head"><span class="tag">${esc(i.type)}</span><span class="status ${esc(i.status)}">${esc(i.status)}</span></div>
      <h3>${esc(i.title)}</h3>
      <div class="meta">
        ${i.campaign ? `<span class="camp">${esc(i.campaign)}</span>` : ''}
        ${i.channel ? `<span>${esc(i.channel)}</span>` : ''}
        ${i.market ? `<span>${esc(i.market)}</span>` : ''}
        ${i.publishedAt ? `<span>${fmtDate(i.publishedAt)}</span>` : ''}
      </div>
      <a class="link" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">${esc(host(i.url))} ↗</a>
      ${i.notes ? `<p class="notes">${esc(i.notes)}</p>` : ''}
      <div class="card-actions">
        <a class="btn primary sm" href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">Open</a>
        <button class="btn ghost sm" data-copy="${esc(i.id)}">Copy link</button>
        ${state.admin ? `<button class="btn ghost sm" data-edit="${esc(i.id)}">Edit</button>
        <button class="btn ghost sm danger" data-del="${esc(i.id)}">Delete</button>` : ''}
      </div>
    </article>`).join('');

  const empty = $('#empty');
  empty.classList.toggle('hidden', list.length > 0);
  empty.textContent = state.items.length ? 'No assets match these filters.' : (state.admin ? 'No assets yet — click “+ Add asset” to add the first one.' : 'No assets yet.');
}

// --- events
['#q', '#fCampaign', '#fType', '#fStatus'].forEach((s) => $(s).addEventListener('input', render));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

$('#loginBtn').onclick = () => { $('#loginErr').textContent = ''; $('#loginDlg').showModal(); };
$('#loginForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: e.target.password.value }) });
    e.target.reset(); $('#loginDlg').close(); toast('Logged in'); load();
  } catch (err) { $('#loginErr').textContent = err.message; }
};
$('#logoutBtn').onclick = async () => { await api('/api/logout', { method: 'POST' }); toast('Logged out'); load(); };

function openAsset(item) {
  const f = $('#assetForm'); f.reset();
  $('#assetErr').textContent = '';
  $('#assetDlgTitle').textContent = item ? 'Edit asset' : 'Add asset';
  const v = item || { type: state.types[0], status: 'Live', publishedAt: new Date().toISOString().slice(0, 10), campaign: $('#fCampaign').value };
  ['id', 'title', 'url', 'type', 'status', 'campaign', 'channel', 'market', 'publishedAt', 'notes'].forEach((k) => { f[k].value = v[k] ?? ''; });
  $('#assetDlg').showModal();
}
$('#addBtn').onclick = () => openAsset();
$('#assetForm').onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    await api('/api/assets', { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data) });
    $('#assetDlg').close(); toast(data.id ? 'Asset updated' : 'Asset added'); load();
  } catch (err) { $('#assetErr').textContent = err.message; }
};

$('#grid').addEventListener('click', async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const find = (id) => state.items.find((i) => i.id === id);
  if (b.dataset.copy) {
    const url = find(b.dataset.copy).url;
    try { await navigator.clipboard.writeText(url); } catch { prompt('Copy link:', url); return; }
    toast('Link copied');
  }
  if (b.dataset.edit) openAsset(find(b.dataset.edit));
  if (b.dataset.del) {
    const item = find(b.dataset.del);
    if (!confirm(`Delete "${item.title}"?`)) return;
    try { await api('/api/assets', { method: 'DELETE', body: JSON.stringify({ id: item.id }) }); toast('Deleted'); load(); }
    catch (err) { alert(err.message); }
  }
});

$('#exportBtn').onclick = () => {
  const cols = ['title', 'type', 'status', 'campaign', 'channel', 'market', 'publishedAt', 'url', 'notes'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...filtered().map((i) => cols.map((c) => cell(i[c])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `sportsbook-campaign-assets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

load();
