# How to Deploy / Run

Everything needed to go from zero to a running local dev environment and a deployed production app. Follow steps in order.

---

## Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account
- A [Vercel](https://vercel.com) account
- A GitHub repo (Vercel auto-deploys from it)
- A Gmail account — optional but needed to raise the email rate limit above 2/hr

---

## 1. Supabase — Create a Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Pick a name, region, and database password
3. Wait for the project to provision (~1 min)

---

## 2. Supabase — Run SQL

Go to **SQL Editor → New Query** and run these four files **in order**. Each one depends on the previous.

| Order | File | What it does |
|-------|------|-------------|
| 1 | `supabase/schema.sql` | Creates all tables + enables `pgcrypto` extension |
| 2 | `supabase/functions.sql` | Creates `private.get_my_list_ids()` and the `claim_share_link` RPC |
| 3 | `supabase/rls.sql` | Enables RLS, creates all policies, creates indexes |
| 4 | `supabase/seed.sql` | Populates the global item catalog (~130 items) |

> **Why this order**: `functions.sql` references tables from schema. `rls.sql` references `private.get_my_list_ids()` from functions. The seed insert requires RLS to already be in place, and needs the `anon`/`authenticated` roles to be wired up.

---

## 3. Supabase — Configure Auth

### Site URL and Redirect URLs

Magic link emails redirect users back to the app. Supabase needs to know the allowed URLs.

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your production Vercel URL, e.g. `https://your-app.vercel.app`
3. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/**`
   - `http://localhost:5173/**`

> **First-time setup**: You won't know your Vercel URL until Step 8. Skip Site URL for now, finish the rest, then come back and set it after deploying.

> **Why the wildcard on paths**: The magic link redirects back to a specific path (e.g. `/join/token`), not just `/`. The `/**` pattern allows any path on that origin, not just the root.

> **Why localhost needs its own entry**: Supabase won't redirect to any URL not on this list. Add it so local dev works without changing Site URL back and forth.

> **Symptom if missed**: Magic link emails point to `localhost:3000` instead of your deployed app.

### Session Duration

Set the JWT expiry to 180 days so users stay logged in.

1. Go to **Authentication → Settings** (may also appear as "Configuration" in some Supabase versions)
2. Set **JWT expiry** to `15552000` seconds (180 days)
3. Also check: **User Sessions** — set Time-box user sessions to 0 (never) and Inactivity timeout to 0 (never). This lets both users stay logged in indefinitely without re-login.
4. Leave **Enforce single session per user** as false — both household members need to be logged in simultaneously

---

## 4. Supabase — Enable Realtime

Real-time sync (changes appear on all connected phones instantly) requires the `items` table to be added to the Realtime publication.

1. Go to **Database → Publications** — **not** "Database → Replication" (that's a different section for read replicas)
2. Click `supabase_realtime`
3. Toggle on the `items` table

> **Symptom if missed**: WebSocket connects fine (you'll see `phx_reply ok` in the network tab) but no events fire when items are added or toggled.

---

## 5. Supabase — Gmail SMTP (Recommended)

The default rate limit is **2 magic link emails per hour** — too low for real use. Configure Gmail as a custom SMTP provider to raise it to 50/hr.

1. Go to your Google Account → **Security → App Passwords**
2. Generate an app password for "Mail" (requires 2FA to be enabled on your Google account)
3. In Supabase → **Authentication → Settings → SMTP Settings** (scroll down on the same page where you set JWT expiry):
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: your Gmail address
   - Password: the **app password** (not your Gmail login password)
   - Sender name: `Grocery List`
   - Sender email: your Gmail address
4. Save

Supabase shows a warning that Gmail isn't a transactional provider — safe to ignore for a small household app.

### Email Template (Optional)

Customize the magic link email under **Authentication → Email Templates → Magic Link**:

- Subject: `Your Grocery List login link`
- Body: A green "Sign in" button pointing to `{{ .ConfirmationURL }}`, with a note that the link expires in 24 hours

---

## 6. Supabase — Get Your Keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon / public** key → this is `VITE_SUPABASE_ANON_KEY`

The anon key is safe to expose in the frontend bundle — RLS enforces all access control.

---

## 7. Local Dev

```sh
git clone https://github.com/tdrmk/grocery-list
cd grocery-list
npm install
```

Create `.env.local` in the project root (never committed):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> **Prefix gotcha**: The prefix must be `VITE_`, not `NEXT_PUBLIC_` (NextJS) or just `SUPABASE_`. Vite only exposes vars with the `VITE_` prefix to frontend code — anything else is undefined at runtime. The values are baked in at build time, not injected at runtime.

> **Corporate/VPN network note**: If `npm install` resolves packages from an internal registry, add a local `.npmrc` file:
> ```
> registry=https://registry.npmjs.org
> ```
> Keep this gitignored (covered by `.*` in `.gitignore`).

```sh
npm run dev       # Starts at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Serve the build locally to verify before deploying
```

> **Port drift**: Vite defaults to 5173 but increments if the port is busy. To pin it, add to `vite.config.js`:
> ```js
> server: { port: 5173, strictPort: true }
> ```
> Then `http://localhost:5173/**` in Supabase Redirect URLs will always work.

---

## 8. Deploy to Vercel

### Connect the repo

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select this repo
3. Framework preset: **Vite** (auto-detected)
4. Build command: `npm run build`, Output directory: `dist`

### Add environment variables

**Before deploying**, add these under **Project → Settings → Environment Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`.env.local` is never committed and is never read by Vercel — vars must be added there explicitly.

> **Timing matters**: Vite bakes env vars into the JS bundle at build time. If the first deploy ran before you added them, the app will render blank. Fix: add the vars, then go to **Deployments → latest deployment → Redeploy**.

### Deploy

Push to `main` → Vercel auto-deploys. Note the deployed URL (e.g. `https://your-app.vercel.app`) and update Supabase's Site URL (Step 3) if you hadn't set it yet.

### SPA routing

`vercel.json` is already in the repo:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

This ensures direct visits to routes like `/join/:token` don't 404. Without it, Vercel returns 404 for any non-root URL since there's no file at those paths.

---

## 9. First Run Checklist

1. Open the app URL in your browser
2. Enter your email → receive magic link → tap it → redirected back to app
3. Enter your display name (first-time profile setup)
4. Create a list → tap Add Items → browse the catalog
5. Copy the share link → open in another browser/device → second user joins
6. Add an item on one device → verify it appears on the other in real time
7. **Android**: "Add to Home Screen" prompt appears after a few visits (requires 192×192 and 512×512 PNG icons — already in `public/`)
8. **iOS Safari**: no automatic prompt — tap Share → "Add to Home Screen"

---

## 10. PWA Icons

The install prompt on Android Chrome requires PNG icons specifically. SVG-only manifests fail the installability check silently.

`public/manifest.json` already references:
- `/icon-192.png` — 192×192, required for Android install prompt
- `/icon-512.png` — 512×512 maskable, required for Android install prompt
- `/favicon.svg` — used everywhere else

If you replace the icons, make sure to keep separate entries for `any` and `maskable` purposes — combining them into `"any maskable"` in a single entry breaks Chrome.

---

## Quick Reference — Key Files

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Table definitions — run first |
| `supabase/functions.sql` | RPC functions — run second |
| `supabase/rls.sql` | RLS policies + indexes — run third |
| `supabase/seed.sql` | Catalog seed data — run fourth |
| `vercel.json` | SPA rewrite rule for client-side routing |
| `src/supabaseClient.js` | Reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| `.env.local` | Local env vars — never committed |

For more encountered issues and their fixes, see [`.gotchas.md`](.gotchas.md).
