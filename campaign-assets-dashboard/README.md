# Sportsbook Campaign Assets Dashboard

A simple dashboard to collect every published campaign asset (landing pages, articles, social posts, press releases, banners, videos, emails) with its public link.
It uses the Digitain Sportsbook visual identity: Bebas Neue + Roboto Condensed, a black-to-navy-to-blue gradient, and the horizontal logo.

- **Anyone with the link** can view, search, filter, open, copy links and export to CSV.
- **Admin** (password login) can add, edit and delete assets.
- No framework and no npm dependencies. Static frontend plus 4 small Vercel serverless functions.
- Data is stored in **Upstash Redis** (free tier, connected in one click from Vercel).

---

## Deploy in 4 steps

### 1. Push to GitHub
Create a new empty repository on GitHub (for example `sportsbook-campaign-assets`), then upload this folder:
- **Easiest:** on the new repo page, click **"uploading an existing file"** and drag in everything in this folder (including the `api`, `lib`, `public` and `scripts` folders).
- **Or with git:**
  ```bash
  cd campaign-assets-dashboard
  git init && git add . && git commit -m "Campaign assets dashboard"
  git branch -M main
  git remote add origin https://github.com/<your-org>/sportsbook-campaign-assets.git
  git push -u origin main
  ```

### 2. Import into Vercel
Vercel → **Add New… → Project** → pick the repo → **Framework preset: Other** → Deploy.
(Leave the build command empty. The output directory is already set in `vercel.json`.)

### 3. Connect storage
In the Vercel project: **Storage → Create / Connect → Upstash (Marketplace) → Redis** → choose the free plan → connect it to the project.
This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically.

### 4. Set the admin password
Project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | your admin password |
| `SESSION_SECRET` | any long random string (e.g. 40+ random characters) |
| `PUBLIC_VIEW` | `true` (anyone with the link can view) or `false` (login required to view) |

Then **Deployments → ⋯ → Redeploy**. Done. Open the site, click **Admin login** and start adding assets.

---

## Run locally (optional)
Requires Node 18+.
```bash
ADMIN_PASSWORD=test npm run dev        # macOS / Linux
$env:ADMIN_PASSWORD="test"; npm run dev  # Windows PowerShell
```
Open http://localhost:3000. Without Redis env vars, data is saved to `.data/assets.json` (local only, git-ignored).

## Project structure
```
api/        assets.js (list/add/edit/delete) · login.js · logout.js · me.js
lib/        auth.js (signed cookie) · store.js (Redis / local file) · http.js
public/     index.html · app.js · styles.css · fonts/ · assets/logo.svg
scripts/    dev-server.js (local preview)
```

## Customising
- **Asset types / statuses:** edit `TYPES` and `STATUSES` at the top of `api/assets.js`.
- **Colours / fonts:** CSS variables at the top of `public/styles.css`.
- **Header text:** the `hero` section in `public/index.html`.

## Notes
- To change the password, update `ADMIN_PASSWORD` in Vercel and redeploy. Changing `SESSION_SECRET` logs everyone out.
- Only `http(s)://` links are accepted, and all text is escaped before it is shown.
- All data is one JSON list in Redis (key `sb:campaign-assets`). That is fine for thousands of assets. Use **Export CSV** for backups.
