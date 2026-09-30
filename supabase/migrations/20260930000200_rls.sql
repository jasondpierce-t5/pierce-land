-- M1.2 — Roles and RLS (SPEC §3), protected deletes, and the void pattern (§6).
--
--   capability                                                      owner  hand  vet
--   read all farm data                                                ✓     ✓     ✓
--   lots, animals, processing, treatments, deaths, inventory use      ✓     ✓     –
--   products, protocols, costs, sales, closeout, members, farm        ✓     –     –
--   void a record                                                     ✓   own, <24h –

-- ---------------------------------------------------------------------------------------------
-- Membership helpers. SECURITY DEFINER so policies on farm_members don't recurse.
-- ---------------------------------------------------------------------------------------------
create function private.member_role(p_farm uuid) returns public.member_role
language sql stable security definer
set search_path = ''
as $$
  select m.role from public.farm_members m where m.farm_id = p_farm and m.user_id = auth.uid()
$$;

create function private.is_member(p_farm uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$ select private.member_role(p_farm) is not null $$;

-- Owners and hands do the cattle work.
create function private.can_work(p_farm uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce(private.member_role(p_farm) in ('owner', 'hand'), false) $$;

create function private.is_owner(p_farm uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$ select coalesce(private.member_role(p_farm) = 'owner', false) $$;

revoke all on function private.member_role(uuid), private.is_member(uuid), private.can_work(uuid),
  private.is_owner(uuid) from public;
grant execute on function private.member_role(uuid), private.is_member(uuid), private.can_work(uuid),
  private.is_owner(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Table privileges. anon gets nothing; nobody deletes except where a policy allows it.
-- ---------------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke delete, truncate, references, trigger on all tables in schema public from authenticated;
-- New tables must opt in to access explicitly.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke delete, truncate, references, trigger on tables from authenticated;

-- §3: nobody can DELETE the protected tables — not the API roles, not the service role.
revoke delete, truncate on public.administrations, public.treatments, public.processing_events,
  public.animals from authenticated, anon, service_role;

-- Deletes that are allowed (owner-only via policy).
grant delete on public.lot_costs, public.protocol_steps, public.farm_members to authenticated;

-- Voidable tables are edited only through void_record() — except the treatment follow-up fields
-- and the animal's own details. (Column grants: an UPDATE naming any other column is refused.)
revoke update on public.administrations, public.processing_events, public.treatments, public.animals
  from authenticated;
grant update (outcome, recheck_date, notes) on public.treatments to authenticated;
grant update (lot_id, visual_tag, eid, sex, description, status, arrival_date, removal_date,
  removal_reason, sale_id, is_replacement_candidate) on public.animals to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------------------------
alter table public.farms enable row level security;
create policy farms_select on public.farms for select to authenticated
  using (private.is_member(id));
create policy farms_update on public.farms for update to authenticated
  using (private.is_owner(id)) with check (private.is_owner(id));

alter table public.farm_members enable row level security;
create policy farm_members_select on public.farm_members for select to authenticated
  using (private.is_member(farm_id));
create policy farm_members_insert on public.farm_members for insert to authenticated
  with check (private.is_owner(farm_id));
create policy farm_members_update on public.farm_members for update to authenticated
  using (private.is_owner(farm_id)) with check (private.is_owner(farm_id));
create policy farm_members_delete on public.farm_members for delete to authenticated
  using (private.is_owner(farm_id));

-- Cattle work: members read; owners and hands insert and update.
do $$
declare t text;
begin
  foreach t in array array[
    'lots', 'animals', 'inventory_items', 'processing_sessions', 'session_bottles',
    'processing_events', 'administrations', 'treatments', 'deaths'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member(farm_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.can_work(farm_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.can_work(farm_id)) with check (private.can_work(farm_id))', t || '_update', t);
  end loop;
end;
$$;

-- Owner-only: members read; owners insert, update (and delete where granted above).
do $$
declare t text;
begin
  foreach t in array array['products', 'protocols', 'protocol_steps', 'lot_costs', 'sales'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member(farm_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.is_owner(farm_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.is_owner(farm_id)) with check (private.is_owner(farm_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.is_owner(farm_id))', t || '_delete', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Void pattern (§6): voided rows can't be edited or un-voided; administrations and processing
-- events can't be edited at all except by voiding.
-- ---------------------------------------------------------------------------------------------
create function private.guard_voided() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.voided_at is not null then
    raise exception 'This record was voided and can''t be changed. Re-enter it instead.'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create function private.guard_void_only() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  audit_and_void constant text[] := array['voided_at', 'void_reason', 'created_at', 'created_by', 'updated_at'];
begin
  if (to_jsonb(new) - audit_and_void) is distinct from (to_jsonb(old) - audit_and_void) then
    raise exception '% rows can''t be edited; void and re-enter instead.', tg_table_name
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger guard_voided before update on public.animals
  for each row execute function private.guard_voided();
create trigger guard_voided before update on public.treatments
  for each row execute function private.guard_voided();
create trigger guard_voided before update on public.processing_events
  for each row execute function private.guard_voided();
create trigger guard_voided before update on public.administrations
  for each row execute function private.guard_voided();
create trigger guard_void_only before update on public.processing_events
  for each row execute function private.guard_void_only();
create trigger guard_void_only before update on public.administrations
  for each row execute function private.guard_void_only();

-- void_record(table, id, reason): the only way to void. Idempotent: voiding an already-voided
-- record is a no-op, so an outbox retry is safe. Voiding a processing event or a treatment voids
-- its administrations in the same transaction ("Undo last calf").
create function public.void_record(p_table text, p_id uuid, p_reason text) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_reason text := trim(coalesce(p_reason, ''));
  v_farm uuid;
  v_created_by uuid;
  v_created_at timestamptz;
  v_voided_at timestamptz;
  v_role public.member_role;
begin
  if p_table is null or p_table not in ('administrations', 'treatments', 'processing_events', 'animals') then
    raise exception 'Records in % can''t be voided', coalesce(p_table, '(null)') using errcode = '22023';
  end if;
  if length(v_reason) < 5 then
    raise exception 'A void reason of at least 5 characters is required' using errcode = '22023';
  end if;

  execute format('select farm_id, created_by, created_at, voided_at from public.%I where id = $1 for update', p_table)
    into v_farm, v_created_by, v_created_at, v_voided_at
    using p_id;

  v_role := case when v_farm is null then null else private.member_role(v_farm) end;
  if v_role is null then
    raise exception 'Record not found' using errcode = 'P0002';
  elsif v_role = 'vet' then
    raise exception 'Vets have read-only access' using errcode = '42501';
  elsif v_role = 'hand' and (v_created_by is distinct from auth.uid() or v_created_at < now() - interval '24 hours') then
    raise exception 'Hands can void only their own records, within 24 hours' using errcode = '42501';
  end if;

  if v_voided_at is not null then
    return;
  end if;

  execute format('update public.%I set voided_at = now(), void_reason = $2 where id = $1', p_table)
    using p_id, v_reason;

  if p_table = 'processing_events' then
    update public.administrations set voided_at = now(), void_reason = v_reason
     where processing_event_id = p_id and voided_at is null;
  elsif p_table = 'treatments' then
    update public.administrations set voided_at = now(), void_reason = v_reason
     where treatment_id = p_id and voided_at is null;
  end if;
end;
$$;

revoke all on function public.void_record(text, uuid, text) from public, anon;
grant execute on function public.void_record(text, uuid, text) to authenticated;
