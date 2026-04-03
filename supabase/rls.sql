-- Enable RLS on all tables
alter table profiles    enable row level security;
alter table lists       enable row level security;
alter table list_members enable row level security;
alter table catalog     enable row level security;
alter table items       enable row level security;
alter table share_links enable row level security;

-- ============================================================
-- Profiles
-- ============================================================

create policy "Profiles are viewable by authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can create their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- ============================================================
-- Lists
-- ============================================================

create policy "Users see their lists"
  on lists for select
  using (
    created_by = auth.uid()
    or id in (select list_id from list_members where user_id = auth.uid())
  );

create policy "Authenticated users can create lists"
  on lists for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());

create policy "Creator can delete list"
  on lists for delete
  using (created_by = auth.uid());

-- ============================================================
-- List members
-- ============================================================

create policy "Users see members of their lists"
  on list_members for select
  using (user_id = auth.uid());

create policy "Users can join lists"
  on list_members for insert
  with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- ============================================================
-- Catalog
-- ============================================================

create policy "Global catalog readable by authenticated users"
  on catalog for select
  using (is_global = true and auth.role() = 'authenticated');

create policy "Custom catalog readable by authenticated users"
  on catalog for select
  using (not is_global and auth.role() = 'authenticated');

create policy "Users can add custom catalog items"
  on catalog for insert
  with check (auth.role() = 'authenticated' and is_global = false);

-- ============================================================
-- Items
-- ============================================================

create policy "Users manage items on their lists"
  on items for all
  using (
    list_id in (select list_id from list_members where user_id = auth.uid())
  );

-- ============================================================
-- Share links
-- ============================================================

create policy "Authenticated users can read unused share links"
  on share_links for select
  using (auth.role() = 'authenticated' and used = false);

create policy "List members can create share links"
  on share_links for insert
  with check (
    list_id in (select list_id from list_members where user_id = auth.uid())
  );

create policy "Authenticated users can mark share links as used"
  on share_links for update
  using (auth.role() = 'authenticated' and used = false)
  with check (used = true);
