# Grocery List — Blueprint

Everything needed to start building. Read this, set up the tools, and go.

---

## User Flow

### First Time Setup (once per person)

```
You open the URL on your phone (e.g. grocery.yourdomain.com)
    → See a login screen
    → Enter your email
    → Check your email → tap the magic link
    → You're in → app asks for your display name (first time only)
    → Browser prompts "Add to Home Screen" → tap yes
    → App icon appears on your phone like a regular app
    → You stay logged in for 6 months

Wife does the same on her iPhone via Safari
```

### Creating a List

```
You open the app → see "My Lists" (empty at first)
    → Tap "New List"
    → Name it "Weekly Groceries"
    → You're now looking at an empty list
    → Tap "Share" → generates a link
    → Send the link to your wife via WhatsApp
    → She taps it → she's now a member of "Weekly Groceries"
    → The list appears in her "My Lists" too
```

### Adding Items (the main flow)

```
You open "Weekly Groceries"
    → See the item catalog — a grid of common items with icons
    → Tap "Paneer" → it's added to the list
    → Tap "Atta" → added
    → Tap "Milk" → added, then tap it on the list to add "2x, full fat"
    → Need something not in the catalog?
        → Tap search, type "Amul Butter"
        → Not found → tap "Add custom item"
        → Optionally pick an icon from the catalog icons
        → It's added to the list AND saved to your household catalog for next time

Your wife's phone updates — she sees Paneer, Atta, Milk, Amul Butter appear
```

### At the Store

```
Wife opens the app at the store
    → Sees the list grouped by category:

    🥛 Dairy & Eggs
       Paneer
       Milk (2x, full fat)
       Amul Butter

    🌾 Pantry & Dry Goods
       Atta

    → She picks up Paneer → taps it → moves to "Purchased" section at bottom
    → Picks up Milk → taps it → purchased
    → Can't find Amul Butter, gets a different brand
        → That's fine, just taps it off when she grabs the alternative
    → Accidentally tapped Atta as purchased but hasn't picked it up yet
        → Scrolls to "Purchased" section → taps Atta → moves back to active list
```

### After Shopping

```
List now shows:

    Active:
       Atta (still need to get this)

    ── Purchased ──
       Paneer ✓
       Milk ✓
       Amul Butter ✓

Next time you open the app:
    → The purchased items are still there in the purchased section
    → You can clear them or they stay as history
    → "Recently purchased" in the catalog shows Paneer, Milk, Amul Butter
        for quick re-add next week
```

### Next Week

```
You open "Weekly Groceries"
    → Clear last week's purchased items
    → "Recently Purchased" section shows last week's items
    → Tap Paneer, Milk, Atta → re-added instantly
    → Add a few new things from catalog
    → Done in 30 seconds — you didn't type anything
```

### Multiple Lists

```
Costco run coming up
    → Create "Costco" list
    → Share with wife
    → Add bulk items there
    → "Weekly Groceries" stays separate
    → Both lists appear in "My Lists"
```

The core loop: after the first few weeks, your catalog has everything you usually buy, and building next week's list is mostly just tapping items — not typing.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| **Database** | Supabase (Postgres) | Auto-generated REST API, built-in auth, real-time subscriptions, free tier, no credit card |
| **Auth** | Supabase Auth | Magic link (passwordless), persistent 180-day sessions, JWT-based |
| **Frontend** | React | Large ecosystem, good Supabase docs/examples |
| **Hosting** | Vercel | Free, auto-deploys from GitHub, free HTTPS |
| **PWA** | Service worker + manifest | Installable on iOS and Android, read-only offline cache |

---

## Architecture

```
┌─────────────────────────────────────────┐
│           User's Phone (PWA)            │
│                                         │
│   React frontend                        │
│   ├── Supabase JS client               │
│   ├── Service worker (offline cache)    │
│   └── PWA manifest (installable)        │
│                                         │
│         ↕ HTTPS (direct to Supabase)    │
│                                         │
│   Supabase                              │
│   ├── Postgres database                 │
│   ├── Auto-generated REST API           │
│   ├── Auth (magic link, 180-day sessions)   │
│   ├── Real-time subscriptions           │
│   └── RLS (row-level security)          │
└─────────────────────────────────────────┘

Vercel serves the static frontend files.
No middle server — frontend talks to Supabase directly.
Auth is JWT-based; anon key is public and safe (RLS enforces access).
```

---

## Database Schema

### `profiles`
Extends Supabase's internal `auth.users` with app-specific data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | References `auth.users.id` |
| name | text | Display name |
| created_at | timestamptz | Default: now() |

### `lists`
Each grocery list.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| name | text | e.g. "Weekly", "Costco" |
| created_by | uuid (FK) | References `profiles.id` |
| created_at | timestamptz | Default: now() |

### `list_members`
Who has access to which list.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| list_id | uuid (FK) | References `lists.id` |
| user_id | uuid (FK) | References `profiles.id` |
| joined_at | timestamptz | Default: now() |

Unique constraint on (list_id, user_id).

### `catalog`
Pre-populated item catalog + household custom items.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| name | text | Item name (e.g. "Paneer", "Milk") |
| category | text | Store section (e.g. "Dairy", "Produce") |
| icon | text | Emoji string (e.g. "🥛") |
| is_global | boolean | true = pre-populated, false = user-added custom item |
| created_by | uuid (FK, nullable) | null for global items; references `profiles.id` for custom items |
| created_at | timestamptz | Default: now() |

Custom catalog items are visible to all authenticated users.

### `items`
Items on a specific list.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| list_id | uuid (FK) | References `lists.id` |
| name | text | Item name |
| quantity | text (nullable) | e.g. "2x", "500g" |
| notes | text (nullable) | e.g. "organic", "the blue package" |
| category | text | Store section |
| icon | text | Emoji string |
| purchased | boolean | Default: false. |
| purchased_at | timestamptz (nullable) | When the item was marked as purchased. Used for "recently purchased" sorting. |
| cleared | boolean | Default: false. "Clear purchased" sets this to true — items stay in DB for "recently purchased" history. |
| catalog_id | uuid (FK, nullable) | References `catalog.id` if added from catalog |
| added_at | timestamptz | Default: now() |

Active list = `purchased = false AND cleared = false`. Purchased section = `purchased = true AND cleared = false`. Recently purchased = `cleared = true` ordered by `purchased_at` desc.

### `share_links`
For sharing lists via link.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| list_id | uuid (FK) | References `lists.id` |
| token | text (unique) | Random token for the share URL |
| used | boolean | Default: false. Set to true after first person joins. |
| created_by | uuid (FK) | References `profiles.id` |
| created_at | timestamptz | Default: now() |

---

## RLS Policies

```sql
-- Profiles: users can read any profile, update only their own
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Lists: users can see lists they're a member of
CREATE POLICY "Users see their lists"
  ON lists FOR SELECT
  USING (
    id IN (SELECT list_id FROM list_members WHERE user_id = auth.uid())
  );

-- Lists: any authenticated user can create a list
CREATE POLICY "Authenticated users can create lists"
  ON lists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Lists: only creator can delete
CREATE POLICY "Creator can delete list"
  ON lists FOR DELETE
  USING (created_by = auth.uid());

-- List members: users can see members of lists they belong to
CREATE POLICY "Users see members of their lists"
  ON list_members FOR SELECT
  USING (
    list_id IN (SELECT list_id FROM list_members WHERE user_id = auth.uid())
  );

-- List members: authenticated users can insert themselves (for join via share link)
CREATE POLICY "Users can join lists"
  ON list_members FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

-- Items: users can read/insert/update/delete items on their lists
CREATE POLICY "Users manage items on their lists"
  ON items FOR ALL
  USING (
    list_id IN (SELECT list_id FROM list_members WHERE user_id = auth.uid())
  );

-- Catalog: global items readable by all authenticated users
CREATE POLICY "Global catalog readable by all"
  ON catalog FOR SELECT
  USING (is_global = true AND auth.role() = 'authenticated');

CREATE POLICY "Custom catalog readable by authenticated users"
  ON catalog FOR SELECT
  USING (NOT is_global AND auth.role() = 'authenticated');

-- Catalog: authenticated users can insert custom items
CREATE POLICY "Users can add custom catalog items"
  ON catalog FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND is_global = false);

-- Share links: anyone authenticated can read unused links (to join via link)
CREATE POLICY "Authenticated users can read share links"
  ON share_links FOR SELECT
  USING (auth.role() = 'authenticated' AND used = false);

-- Share links: list members can create share links
CREATE POLICY "List members can create share links"
  ON share_links FOR INSERT
  WITH CHECK (
    list_id IN (SELECT list_id FROM list_members WHERE user_id = auth.uid())
  );

-- Share links: authenticated users can mark links as used (join flow)
CREATE POLICY "Users can mark share links as used"
  ON share_links FOR UPDATE
  USING (auth.role() = 'authenticated' AND used = false)
  WITH CHECK (used = true);
```

---

## Categories (Built-in)

Pre-defined store sections for auto-categorization:

- Produce (fruits & vegetables)
- Dairy & Eggs
- Bakery
- Meat & Seafood
- Frozen
- Pantry & Dry Goods
- Spices & Masalas
- Snacks
- Beverages
- Household & Cleaning
- Personal Care
- Other

---

## Feature Priority

### MVP (build first)
- [ ] Supabase project setup (tables, RLS, auth)
- [ ] Magic link auth with 180-day persistent sessions
- [ ] Profile creation on first login (display name prompt)
- [ ] Single list — add items from catalog, remove when bought
- [ ] Item quantity and notes
- [ ] Pre-populated catalog (~100-150 items with icons)
- [ ] Items grouped by category
- [ ] Purchased section with undo (move back to active)
- [ ] Deploy to Vercel as PWA

### V1 (build next)
- [ ] Multiple lists with naming
- [ ] Share list via link
- [ ] Real-time sync (Supabase subscriptions)
- [ ] Custom items with auto-save to household catalog
- [ ] Icon picker for custom items
- [ ] Recently purchased / quick re-add
- [ ] User presence (names on list)

### Later
- [ ] Frequently bought items / suggestions
- [ ] Read-only offline mode (service worker cache)
- [ ] Dark mode
- [ ] Leaving a shared list

---

## Setup Steps

### 1. Supabase
- Create project at supabase.com (already done — free tier, no card)
- Enable Magic Link in Authentication → Providers → Email (enabled by default)
- Set session/refresh token expiry to 180 days in Authentication → Settings
- Create tables using the schema above in Table Editor or SQL Editor
- Add RLS policies via SQL Editor
- Copy project URL and anon key for the frontend

### 2. GitHub Repo
- Create a new repo (e.g. `grocery-list`)
- Initialize with React (e.g. `npm create vite@latest grocery-list -- --template react`)
- Add `manifest.json` and `sw.js` for PWA support
- Install Supabase client: `npm install @supabase/supabase-js`

### 3. Vercel
- Connect GitHub repo to Vercel
- Deploy — auto-builds on every push
- Add custom domain if desired (free on Vercel)

### 4. Pre-populate Catalog
- Prepare a JSON/CSV of ~100-150 items with name, category, and icon
- Seed into the `catalog` table via Supabase SQL Editor or a script

---

## Key Code Patterns

### Supabase Client Setup
```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)
```

### Profile Creation (on first login)
On first login, check if a profile exists. If not, prompt for display name and create one.
```js
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single()
    
    if (!profile) {
      // First login — prompt for name, then:
      await supabase.from('profiles').insert({
        id: session.user.id,
        name: displayName
      })
    }
  }
})
```

### Auth
```js
// Login / Sign up (same function — sends magic link email)
await supabase.auth.signInWithOtp({ email })

// Check session on app load (also handles magic link redirect)
const { data: { session } } = await supabase.auth.getSession()

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  // update UI based on login/logout
})
```

### CRUD
```js
// Create a new list (auto-add creator as member)
const { data: list } = await supabase
  .from('lists')
  .insert({ name: 'Weekly Groceries', created_by: userId })
  .select()
  .single()

// Add creator as list member
await supabase.from('list_members').insert({
  list_id: list.id,
  user_id: userId
})

// Get items on a list (active only)
const { data } = await supabase
  .from('items')
  .select('*')
  .eq('list_id', listId)
  .eq('cleared', false)
  .order('category')

// Add item
await supabase.from('items').insert({
  list_id: listId,
  name: 'Paneer',
  quantity: '200g',
  category: 'Dairy & Eggs',
  icon: '🧀'
})

// Mark as purchased
await supabase.from('items')
  .update({ purchased: true, purchased_at: new Date().toISOString() })
  .eq('id', itemId)

// Undo purchase (move back to active)
await supabase.from('items')
  .update({ purchased: false, purchased_at: null })
  .eq('id', itemId)

// Clear purchased items (keeps them for "recently purchased")
await supabase.from('items')
  .update({ cleared: true })
  .eq('list_id', listId)
  .eq('purchased', true)

// Get recently purchased (for quick re-add)
const { data: recent } = await supabase
  .from('items')
  .select('name, category, icon, catalog_id')
  .eq('list_id', listId)
  .eq('cleared', true)
  .order('purchased_at', { ascending: false })
  .limit(20)

// Delete item
await supabase.from('items')
  .delete()
  .eq('id', itemId)
```

### Real-time Subscription
```js
supabase
  .channel('list-items')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${listId}` },
    (payload) => {
      // update local state with the change
    }
  )
  .subscribe()
```

### Share Link Flow
Share links point to a route like `yourdomain.com/join/:token`. When the recipient opens it:

**If not logged in:** show login screen first, store the token, then auto-join after auth completes.

**If logged in:**
```js
// 1. Read the token from URL
const token = getTokenFromUrl()

// 2. Look up the share link
const { data: link } = await supabase
  .from('share_links')
  .select('list_id, used')
  .eq('token', token)
  .single()

// 3. Validate
if (!link || link.used) {
  // Show "link expired or already used"
  return
}

// 4. Add user to the list
await supabase.from('list_members').insert({
  list_id: link.list_id,
  user_id: currentUserId
})

// 5. Mark link as used
await supabase.from('share_links')
  .update({ used: true })
  .eq('token', token)

// 6. Redirect to the list
navigate(`/list/${link.list_id}`)
```

---

## Project Structure
```
grocery-list/
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   └── icons/               # App icons + item catalog icons
├── src/
│   ├── main.jsx             # Entry point
│   ├── App.jsx              # Router, auth guard
│   ├── supabaseClient.js    # Supabase init
│   ├── components/
│   │   ├── Auth.jsx          # Login screen (email input for magic link)
│   │   ├── ProfileSetup.jsx   # First-login name prompt
│   │   ├── ListsView.jsx     # All lists
│   │   ├── ListView.jsx      # Single list with items
│   │   ├── AddItem.jsx       # Catalog browser + search + custom add
│   │   ├── ItemCard.jsx      # Single item tile
│   │   ├── ShareList.jsx     # Generate/manage share link
│   │   └── JoinList.jsx      # Handle /join/:token route
│   └── data/
│       └── catalog.json      # Pre-populated item catalog
├── index.html
├── package.json
└── vite.config.js
```
