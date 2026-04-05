-- ============================================================
-- Private schema: unexposed RLS helper functions
-- Not accessible via the API, only callable from policies.
-- ============================================================

create schema if not exists private;

-- Returns the list IDs the current user belongs to.
-- security definer bypasses RLS on list_members, preventing
-- infinite recursion in the list_members SELECT policy.
create function private.get_my_list_ids()
returns setof uuid
language sql
security definer
set search_path = ''
as $$
  select list_id from public.list_members where user_id = (select auth.uid())
$$;

-- ============================================================
-- claim_share_link
-- Atomically claims a share link and joins the list.
-- Handles graceful navigation for members/creators (no claim consumed).
-- ============================================================

create function public.claim_share_link(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link record;
  v_uid  uuid;
begin
  v_uid := (select auth.uid());

  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Find share link by token (security definer bypasses RLS)
  select id, list_id, claimed_by
  from public.share_links
  where token = p_token
  into v_link;

  if not found then
    raise exception 'invalid_token' using hint = 'Link is invalid or already used';
  end if;

  -- Already a list member (creator, previous join, re-click) → navigate without touching the link
  if exists (
    select 1 from public.list_members
    where list_id = v_link.list_id and user_id = v_uid
  ) then
    return v_link.list_id;
  end if;

  -- Claimed by someone else and caller is not a member → reject
  if v_link.claimed_by is not null and v_link.claimed_by != v_uid then
    raise exception 'invalid_token' using hint = 'Link is invalid or already used';
  end if;

  -- Claim if still unclaimed
  if v_link.claimed_by is null then
    update public.share_links
    set claimed_by = v_uid
    where id = v_link.id;
  end if;

  -- Join the list (on conflict handles the claimed-but-not-joined edge case)
  insert into public.list_members (list_id, user_id)
  values (v_link.list_id, v_uid)
  on conflict do nothing;

  return v_link.list_id;
end;
$$;

-- Restrict to authenticated users only
revoke execute on function public.claim_share_link(text) from anon;
grant execute on function public.claim_share_link(text) to authenticated;
