# Grocery List

A shared grocery list PWA. Built with React + Supabase + Vercel.

For full detail on user flows, schema, RLS policies, and code patterns — see `blueprint.md`.

## Stack
- **Frontend**: React (Vite), React Router
- **Backend**: Supabase (Postgres, Auth, Realtime, RLS)
- **Hosting**: Vercel (static frontend, auto-deploy from GitHub)
- **Auth**: Supabase magic link, 180-day sessions
- **PWA**: manifest.json + service worker (offline read cache)

## Key Conventions
- Icons are emoji strings stored in the `icon` column (e.g. `"🥛"`, `"🧀"`)
- No backend server — frontend talks directly to Supabase via the JS client
- Supabase anon key is public and safe — RLS enforces all access control
- `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (never commit)

## Database Tables
`profiles`, `lists`, `list_members`, `catalog`, `items`, `share_links`

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
│   └── data/
│       └── catalog.json  # Pre-seeded ~100-150 items with emoji icons
├── public/
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service worker
├── supabase/
│   ├── schema.sql        # Table definitions
│   ├── rls.sql           # RLS policies
│   └── seed.sql          # Catalog seed data
├── blueprint.md          # Full design reference
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

## MVP Scope
Single list, catalog browse, purchased toggle, clear purchased, deploy as PWA.
Multi-list, sharing, and real-time sync come in V1.
