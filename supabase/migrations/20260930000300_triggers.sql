-- M1.3 — Triggers: inventory decrement/restore (§5.6, §6), cost and withdrawal snapshots
-- (§4, §5.5), animal status from deaths and sales (§4), pull number (§5.4), and the
-- post-metaphylaxis acknowledgement (§5.4).
--
-- Chute and sick-pen writes are retried as `insert … on conflict (id) do nothing` (§7).
-- BEFORE ROW triggers still fire for a row that then conflicts, so they must have no side
-- effects and must not raise on a retry. Anything that changes other rows or can refuse the
-- write runs AFTER INSERT, which only fires for rows actually inserted.
--
-- Custom SQLSTATEs (mapped to messages in the app):
--   PLB01 bottle expired · PLB02 bottle empty/discarded · PLB03 bottle has less than the dose
--   PLT01 pull within the post-metaphylaxis interval without acknowledgement

-- ---------------------------------------------------------------------------------------------
-- Bottles
-- ---------------------------------------------------------------------------------------------
create function private.inventory_item_defaults() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.remaining_ml := coalesce(new.remaining_ml, new.size_ml);
  end if;
  if new.status = 'discarded' and (tg_op = 'INSERT' or old.status <> 'discarded') then
    new.discarded_at := coalesce(new.discarded_at, now());
  end if;
  return new;
end;
$$;
create trigger inventory_item_defaults before insert or update on public.inventory_items
  for each row execute function private.inventory_item_defaults();

-- ---------------------------------------------------------------------------------------------
-- Administrations
-- ---------------------------------------------------------------------------------------------

-- Snapshots (side-effect free). The client's values are always replaced.
--   cost_cents            = round(dose_ml × bottle cost_cents / bottle size_ml)   (§5.6)
--   withdrawal_clear_date = given_at (America/Chicago date) + slaughter_withdrawal_days (§5.5)
create function private.administration_snapshots() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_withdrawal_days integer;
  v_cost_cents integer;
  v_size_ml numeric;
begin
  if new.skipped then
    new.cost_cents := 0;
    new.withdrawal_clear_date := null;
    return new;
  end if;

  select p.slaughter_withdrawal_days into v_withdrawal_days from public.products p where p.id = new.product_id;
  select i.cost_cents, i.size_ml into v_cost_cents, v_size_ml
    from public.inventory_items i where i.id = new.inventory_item_id;

  -- Missing product/bottle: leave it to the foreign keys to refuse the row.
  new.cost_cents := coalesce(round(new.dose_ml * v_cost_cents / v_size_ml), 0);
  new.withdrawal_clear_date := (new.given_at at time zone 'America/Chicago')::date + v_withdrawal_days;
  return new;
end;
$$;
create trigger administration_snapshots before insert on public.administrations
  for each row execute function private.administration_snapshots();

-- Take the dose out of the bottle (AFTER INSERT: runs once per real insert, never on a retry).
create function private.administration_use_bottle() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  b public.inventory_items%rowtype;
  v_given_on date := (new.given_at at time zone 'America/Chicago')::date;
begin
  if new.skipped then
    return null;
  end if;

  select * into b from public.inventory_items where id = new.inventory_item_id for update;

  if b.status = 'expired' or b.expiration_date < v_given_on then
    raise exception 'Bottle lot % expired on %. Pick another bottle.', b.lot_number, b.expiration_date
      using errcode = 'PLB01';
  elsif b.status = 'discarded' then
    raise exception 'Bottle lot % was discarded. Pick another bottle.', b.lot_number using errcode = 'PLB02';
  elsif b.status = 'empty' or b.remaining_ml <= 0 then
    raise exception 'Bottle lot % is empty. Switch bottles.', b.lot_number using errcode = 'PLB02';
  elsif b.remaining_ml < new.dose_ml then
    raise exception 'Bottle lot % has % mL left, less than the % mL dose. Switch bottles.',
      b.lot_number, b.remaining_ml, new.dose_ml using errcode = 'PLB03';
  end if;

  update public.inventory_items
     set remaining_ml = remaining_ml - new.dose_ml,
         opened_at = coalesce(opened_at, new.given_at),
         status = case when remaining_ml - new.dose_ml = 0 then 'empty'::public.inventory_status
                       else 'open'::public.inventory_status end
   where id = b.id;
  return null;
end;
$$;
create trigger administration_use_bottle after insert on public.administrations
  for each row execute function private.administration_use_bottle();

-- Voiding a dose puts it back (§6).
create function private.administration_restore_bottle() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.voided_at is null and new.voided_at is not null and not new.skipped then
    update public.inventory_items
       set remaining_ml = remaining_ml + new.dose_ml,
           status = case when status = 'empty' then 'open'::public.inventory_status else status end
     where id = new.inventory_item_id;
  end if;
  return null;
end;
$$;
create trigger administration_restore_bottle after update of voided_at on public.administrations
  for each row execute function private.administration_restore_bottle();

-- ---------------------------------------------------------------------------------------------
-- Treatments
-- ---------------------------------------------------------------------------------------------

-- pull_number = prior non-voided treatments of this animal with the same diagnosis + 1 (§5.4).
create function private.treatment_pull_number() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  select count(*) + 1 into new.pull_number
    from public.treatments t
   where t.animal_id = new.animal_id
     and t.diagnosis = new.diagnosis
     and t.voided_at is null
     and t.id <> new.id;
  return new;
end;
$$;
create trigger treatment_pull_number before insert on public.treatments
  for each row execute function private.treatment_pull_number();

-- A pull before D + X of a metaphylaxis dose needs metaphylaxis_warning_ack (§5.4).
-- Mirrors metaphylaxisStatus() in src/lib/domain/treatment.ts.
create function private.treatment_metaphylaxis_ack() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_pulled_on date := (new.pulled_at at time zone 'America/Chicago')::date;
  v_day integer;
  v_interval integer;
begin
  if new.metaphylaxis_warning_ack then
    return null;
  end if;

  select v_pulled_on - (a.given_at at time zone 'America/Chicago')::date, p.post_metaphylaxis_interval_days
    into v_day, v_interval
    from public.administrations a
    join public.products p on p.id = a.product_id
   where a.animal_id = new.animal_id
     and a.voided_at is null
     and not a.skipped
     and p.post_metaphylaxis_interval_days is not null
     and (a.given_at at time zone 'America/Chicago')::date <= v_pulled_on
     and v_pulled_on < (a.given_at at time zone 'America/Chicago')::date + p.post_metaphylaxis_interval_days
   order by (a.given_at at time zone 'America/Chicago')::date + p.post_metaphylaxis_interval_days desc
   limit 1;

  if found then
    raise exception 'Within post-metaphylaxis interval (day % of %). Acknowledge before saving.', v_day, v_interval
      using errcode = 'PLT01';
  end if;
  return null;
end;
$$;
create trigger treatment_metaphylaxis_ack after insert on public.treatments
  for each row execute function private.treatment_metaphylaxis_ack();

-- ---------------------------------------------------------------------------------------------
-- Animal status
-- ---------------------------------------------------------------------------------------------

-- A death marks the animal dead (§4).
create function private.death_marks_animal() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare v_status public.animal_status;
begin
  select status into v_status from public.animals where id = new.animal_id for update;
  if v_status is distinct from 'active' then
    raise exception 'A death can only be recorded for an active animal (this one is %).', v_status
      using errcode = '55000';
  end if;
  update public.animals
     set status = 'dead', removal_date = new.died_on, removal_reason = 'died'
   where id = new.animal_id;
  return null;
end;
$$;
create trigger death_marks_animal after insert on public.deaths
  for each row execute function private.death_marks_animal();

-- Linking to a sale marks the animal sold (§4). `dead` and `sold` come only from those records;
-- people can move an animal between active and removed (with a reason).
create function private.animal_status_rules() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_from_trigger boolean := pg_trigger_depth() > 1;
begin
  if new.sale_id is distinct from old.sale_id then
    if auth.uid() is not null and not private.is_owner(new.farm_id) then
      raise exception 'Only an owner can record a sale.' using errcode = '42501';
    end if;
    if new.sale_id is null then
      new.status := 'active';
      new.removal_date := null;
      new.removal_reason := null;
    else
      if old.sale_id is null and old.status <> 'active' then
        raise exception 'Only active animals can be sold (this one is %).', old.status using errcode = '55000';
      end if;
      new.status := 'sold';
      new.removal_date := (select s.sale_date from public.sales s where s.id = new.sale_id);
      new.removal_reason := 'sold';
    end if;
  elsif new.status is distinct from old.status and not v_from_trigger then
    if new.status in ('dead', 'sold') then
      raise exception 'Record a % instead of setting the status.', case new.status when 'dead' then 'death' else 'sale' end
        using errcode = '55000';
    elsif old.status in ('dead', 'sold') then
      raise exception 'This animal is %; that can''t be changed from here.', old.status using errcode = '55000';
    elsif new.status = 'removed' then
      if coalesce(trim(new.removal_reason), '') = '' then
        raise exception 'A removal reason is required.' using errcode = '22023';
      end if;
      new.removal_date := coalesce(new.removal_date, private.farm_today());
    else -- back to active
      new.removal_date := null;
      new.removal_reason := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger animal_status_rules before update on public.animals
  for each row execute function private.animal_status_rules();

revoke all on function private.inventory_item_defaults(), private.administration_snapshots(),
  private.administration_use_bottle(), private.administration_restore_bottle(),
  private.treatment_pull_number(), private.treatment_metaphylaxis_ack(), private.death_marks_animal(),
  private.animal_status_rules() from public;
