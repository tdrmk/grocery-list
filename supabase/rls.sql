-- Enable RLS on all tables
alter table profiles    enable row level security;
alter table lists       enable row level security;
alter table list_members enable row level security;
alter table catalog     enable row level security;
alter table items       enable row level security;
alter table share_links enable row level security;

-- ============================================================
-- Indexes
-- Policy filter columns need indexes to avoid full table scans.
-- ============================================================

-- list_members is the join table for nearly every policy — both columns are hit
create index if not exists idx_list_members_user_id on list_members(user_id);
create index if not exists idx_list_members_list_id on list_members(list_id);

-- items.list_id is the filter in the items policy subquery
create index if not exists idx_items_list_id on items(list_id);

-- catalog.created_by is the filter for custom catalog visibility
create index if not exists idx_catalog_created_by on catalog(created_by);

-- share_links.token is the unique claim lookup; list_id is used in INSERT policy
create index if not exists idx_share_links_token   on share_links(token);
create index if not exists idx_share_links_list_id on share_links(list_id);

-- ============================================================
-- Profiles
-- ============================================================

create policy "Profiles are viewable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = id);

-- ============================================================
-- Lists
-- ============================================================

create policy "Users see their lists"
  on lists for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or id in (select list_id from list_members where user_id = (select auth.uid()))
  );

create policy "Authenticated users can create lists"
  on lists for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Creator can delete list"
  on lists for delete
  to authenticated
  using (created_by = (select auth.uid()));

-- ============================================================
-- List members
-- ============================================================

create policy "Users see members of their lists"
  on list_members for select
  to authenticated
  using (
    list_id in (select private.get_my_list_ids())
  );

create policy "List creator can add themselves as member"
  on list_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and list_id in (select id from lists where created_by = (select auth.uid()))
  );

create policy "Users can join via claimed share link"
  on list_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and list_id in (select list_id from share_links where claimed_by = (select auth.uid()))
  );

-- ============================================================
-- Catalog
-- ============================================================

create policy "Global catalog readable by authenticated users"
  on catalog for select
  to authenticated
  using (is_global = true);

create policy "Custom catalog readable by creator"
  on catalog for select
  to authenticated
  using (not is_global and created_by = (select auth.uid()));

create policy "Users can add custom catalog items"
  on catalog for insert
  to authenticated
  with check (is_global = false and created_by = (select auth.uid()));

create policy "Users can update their custom catalog items"
  on catalog for update
  to authenticated
  using (not is_global and created_by = (select auth.uid()))
  with check (not is_global and created_by = (select auth.uid()));

create policy "Users can delete their custom catalog items"
  on catalog for delete
  to authenticated
  using (not is_global and created_by = (select auth.uid()));

-- ============================================================
-- Items
-- ============================================================

create policy "Users can select items on their lists"
  on items for select
  to authenticated
  using (list_id in (select list_id from list_members where user_id = (select auth.uid())));

create policy "Users can insert items on their lists"
  on items for insert
  to authenticated
  with check (list_id in (select list_id from list_members where user_id = (select auth.uid())));

create policy "Users can update items on their lists"
  on items for update
  to authenticated
  using (list_id in (select list_id from list_members where user_id = (select auth.uid())))
  with check (list_id in (select list_id from list_members where user_id = (select auth.uid())));

create policy "Users can delete items on their lists"
  on items for delete
  to authenticated
  using (list_id in (select list_id from list_members where user_id = (select auth.uid())));

-- ============================================================
-- Share links
-- ============================================================

create policy "Creators can read their own share links"
  on share_links for select
  to authenticated
  using (created_by = (select auth.uid()));

create policy "List members can create share links"
  on share_links for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and list_id in (select list_id from list_members where user_id = (select auth.uid()))
  );
