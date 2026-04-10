# Grocery List — Spec

A shared grocery list PWA for households. The core loop: build your catalog over the first few weeks, then next week's list is mostly tapping, not typing.

---

## User Flows

### First Time Setup

```
Open the URL on your phone
    → Login screen → enter email → check email → tap magic link
    → First time: prompted for a display name
    → App shows a banner: "Tap Share → Add to Home Screen"
    → App icon on your phone like a regular app
    → Stays logged in for 6 months
```

### Creating & Sharing a List

```
Open app → "My Lists" (empty at first)
    → Tap "New List" → name it "Weekly Groceries"
    → Tap share icon → link copied to clipboard
    → Send link to wife via WhatsApp
    → She taps it → she's now a member of "Weekly Groceries"
    → List appears in her "My Lists" too
```

Share links expire after 24 hours and can only be claimed once.

### Adding Items

```
Open "Weekly Groceries" → tap "+ Add items"
    → Search bar auto-focuses
    → Type "pan" → catalog filters live → tap "Paneer" → added
    → Clear search → tap "Atta" from the catalog → added
    → Recently purchased section at top (ranked by how often you've bought them)
    → Need something not in the catalog?
        → Search "Amul Butter" → nothing found
        → Tap "Add 'Amul Butter' as custom item" (or tap + in header at any point)
        → Pick an icon and category → save
        → Added to the list AND saved to the list's catalog for next time

Wife's phone updates live — she sees the items appear
```

### At the Store

```
Wife opens the app
    → Sees the list grouped by category:

    Dairy & Eggs
       Paneer
       Milk

    Pantry & Dry Goods
       Atta

    → Picks up Paneer → taps it → moves to "Purchased" section
    → Accidentally tapped Atta → scrolls to Purchased → taps Atta → moves back
```

Purchased items auto-clear overnight (any purchased item from before today is cleared on next open).

### After Shopping

```
Active:
   Atta

── Purchased ──
   Paneer ✓
   Milk ✓

    → Tap "Clear purchased" → they move to history
    → Next week: "Recently purchased" section in Add Items shows them for quick re-add
```

---

## Feature Scope

### Done

- Magic link auth, 180-day sessions
- Display name on first login
- Swipe to delete list (creators) or leave list (members)
- Share list via single-use link (24h expiry)
- Real-time sync across devices (Supabase subscriptions)
- Pre-populated catalog (~100–150 items with emoji icons, grouped by category)
- Custom items — add name, category, icon; saved to the list's catalog, visible to all list members
- Edit and delete custom catalog items
- Add items from catalog to list
- Items grouped by category on the list
- Purchased section with undo (tap to toggle back)
- Swipe to edit or delete individual items
- Edit item quantity and notes
- Clear purchased items (moves to history)
- Auto-clear stale purchased items (purchased before today, cleared on next open)
- Recently purchased section in Add Items for quick re-add
- Member avatars in list header
- iOS install hint banner (Safari only)
- PWA manifest + service worker (app shell cached for fast load; Supabase data is not cached)

### Not Yet Built

- Leaving a shared list ✓
- Dark mode
- Frequently suggested items
- Read-only offline mode (list data is not cached — app shell loads but lists require network)

---

## Data Model (Conceptual)

### profiles
One row per user. Holds display name. Created on first login.

### lists
Each grocery list. Has a name and a creator.

### list_members
Many-to-many join between lists and profiles. A user sees and can edit a list only if they're a member.

### catalog
The item catalog. Two kinds:
- **Global items** (`is_global = true`) — pre-seeded, visible to everyone, not editable by users
- **Custom items** (`is_global = false`) — created by a list member, visible and editable by all members of that list. Linked to the list via `list_id`.

Columns: name, category, icon (emoji string).

### items
Items on a specific list. Linked to a catalog entry when added from the catalog (custom items have their own catalog row too).

Three states:
- **active** — on the shopping list
- **purchased** — tapped off at the store, shown in Purchased section
- **cleared** — history; used to power "Recently purchased" in Add Items

### share_links
Single-use tokens for joining a list. Expire after 24 hours. Claimed atomically server-side.

---

## Categories

Store sections, used for grouping items on the list and in the catalog:

- Produce
- Dairy & Eggs
- Bakery
- Meat & Seafood
- Frozen
- Grains & Flours
- Dals & Pulses
- Pantry & Dry Goods
- Spices & Masalas
- Nuts & Dry Fruits
- Snacks
- Beverages
- Household & Cleaning
- Personal Care
- Custom *(for user-created items that don't fit elsewhere)*
