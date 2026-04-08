# Grocery List

A shared grocery list PWA. Built with React + Supabase + Vercel.

For full detail on user flows and feature scope — see `SPEC.md`.

## Stack
- **Frontend**: React (Vite), React Router
- **Backend**: Supabase (Postgres, Auth, Realtime, RLS)
- **Hosting**: Vercel (static frontend, auto-deploy from GitHub)
- **Auth**: Supabase magic link, 180-day sessions
- **PWA**: manifest.json + service worker (app shell cache only — list data requires network)

## Key Conventions
- Icons are emoji strings stored in the `icon` column (e.g. `"🥛"`, `"🧀"`)
- No backend server — frontend talks directly to Supabase via the JS client
- Supabase anon key is public and safe — RLS enforces all access control
- `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never commit)

## RLS Pitfalls
- **`list_members` recursion**: never write a `list_members` SELECT policy that subqueries `list_members` — it causes infinite recursion. Use `private.get_my_list_ids()` (a `security definer` function that bypasses RLS) instead. Already in `rls.sql` — don't revert it.
- **`lists` INSERT + SELECT**: the `lists` SELECT policy must include `created_by = (select auth.uid())` as an OR condition. Without it, `.insert().select().single()` fails — the chained SELECT runs before the user is added to `list_members`, so membership-only checks reject the creator's own new row. Already in `rls.sql` — don't remove the `created_by` condition.

## Item States (`items` table)
- **Active**: `status='active'`
- **Purchased**: `status='purchased'`
- **History**: `status='cleared'`, ordered by `purchased_at desc`

## Project Structure
```
grocery-list/
├── src/                  # React app
│   ├── main.jsx          # Entry point, service worker registration
│   ├── App.jsx           # Router + auth guard
│   ├── supabaseClient.js # Supabase init (single shared instance)
│   ├── components/       # One file per screen/component
│   │   └── commons/      # Shared UI: Avatar, BottomSheet, Toast, SwipeableRow, EmojiGroup
│   └── data/
│       └── catalog.json  # Pre-seeded ~100-150 items with emoji icons
├── public/
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service worker
├── supabase/
│   ├── schema.sql        # Table definitions
│   ├── rls.sql           # RLS policies + indexes
│   ├── functions.sql     # DB functions: claim_share_link, private.get_my_list_ids
│   └── seed.sql          # Catalog seed data
├── SPEC.md               # Product spec: user flows, feature scope, data model
├── CLAUDE.md
├── package.json
├── vite.config.js
├── index.html
└── .env.local            # Not committed — holds Supabase keys
```

## Commands
```
npm run dev     # Local dev server
npm run build   # Production build → dist/
```
