# Grocery List

A shared grocery list PWA for households. Add items from a pre-populated catalog, share lists with family members, and check things off at the store in real time.

## Features

- Magic link auth (passwordless, no passwords to manage)
- Multiple named lists (Weekly, Costco, etc.)
- Share lists via a one-time link
- Browse a catalog of ~130 common items with emoji icons; search by name
- Add custom items that save to the catalog for future re-use; edit or delete them anytime
- Items grouped by store category
- Tap to mark purchased; tap again to undo (in case you mis-tapped); delete items you no longer need
- Add quantity and notes to any item (e.g. "2x", "500g", "organic")
- Recently purchased section for quick re-add from last shop
- Real-time sync — changes appear on everyone's phone instantly
- Installable on iOS and Android (PWA)

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres, Auth, Realtime, RLS) |
| Hosting | Vercel |

No backend server — the frontend talks directly to Supabase. The anon key is public and safe; RLS enforces all access control.

## Local Setup

You'll need a Supabase project with the database set up — see [`HOW_TO_DEPLOY.md`](HOW_TO_DEPLOY.md) for full steps. Once you have that:

**1. Install dependencies**
```sh
git clone https://github.com/tdrmk/grocery-list
cd grocery-list
npm install
```

**2. Set up environment variables**

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase project under **Settings → API**.

**3. Set up the database**

Run these files in order in the **Supabase SQL Editor**:

1. `supabase/schema.sql` — creates all tables
2. `supabase/functions.sql` — creates RPC functions
3. `supabase/rls.sql` — adds row-level security policies
4. `supabase/seed.sql` — populates the item catalog

## Commands

**Development**
```sh
npm run dev      # Local dev server (http://localhost:5173)
```

**Production**
```sh
npm run build    # Build to dist/
npm run preview  # Serve the build locally to verify before deploying
```

## Deployment

**Supabase auth settings** — in your Supabase project go to **Authentication → Settings** and set the JWT expiry to 180 days (`15552000` seconds) so users stay logged in.

**Vercel** — connect your GitHub repo to Vercel and add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) under **Settings → Environment Variables**. Vercel auto-deploys on every push to main.

For full deployment steps including Realtime setup, Gmail SMTP, and Supabase URL config — see [`HOW_TO_DEPLOY.md`](HOW_TO_DEPLOY.md).

---

For full design detail — user flows, schema, RLS policies, code patterns — see [`blueprint.md`](blueprint.md).