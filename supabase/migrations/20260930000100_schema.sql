-- M1.1 — Schema (SPEC §2, §4).
-- Units: money integer cents, weight numeric(7,1) lb, volume numeric(7,2) mL, temp numeric(4,1) °F.
-- Tenancy: every row carries farm_id. Child rows reference parents by (id, farm_id) so a row can
-- never point at another farm's data.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'hand', 'vet');
create type public.lot_status as enum ('planned', 'receiving', 'active', 'closed');
create type public.lot_sex as enum ('heifer', 'steer', 'mixed');
create type public.animal_sex as enum ('heifer', 'steer', 'bull');
create type public.risk_level as enum ('high', 'moderate', 'low');
create type public.source_type as enum ('sale_barn', 'ranch_direct', 'order_buyer', 'other');
create type public.animal_status as enum ('active', 'sold', 'dead', 'removed');
create type public.drug_class as enum (
  'macrolide', 'phenicol', 'fluoroquinolone', 'cephalosporin', 'tetracycline',
  'vaccine_mlv_resp', 'vaccine_intranasal', 'vaccine_clostridial', 'anthelmintic_ml',
  'anthelmintic_bz', 'prostaglandin', 'nsaid', 'implant', 'other'
);
create type public.dose_basis as enum ('per_100lb', 'per_head');
create type public.product_unit as enum ('mL', 'each');
create type public.route as enum ('SC', 'IM', 'IV', 'oral', 'intranasal', 'pour_on', 'implant', 'topical');
create type public.inventory_status as enum ('in_stock', 'open', 'empty', 'expired', 'discarded');
create type public.protocol_kind as enum ('processing', 'treatment');
create type public.applies_to as enum ('all', 'heifers', 'feeders_only');
create type public.step_conditional as enum ('none', 'temp_gte_threshold');
create type public.session_kind as enum ('arrival', 'booster', 'other');
create type public.session_status as enum ('open', 'closed');
create type public.dose_weight_source as enum ('event_tape', 'recent_tape', 'lot_average');
create type public.administration_source as enum ('processing', 'treatment');
create type public.diagnosis as enum ('brd', 'footrot', 'pinkeye', 'other');
create type public.treatment_outcome as enum ('pending', 'recovered', 'chronic', 'died', 'removed');
create type public.cost_category as enum (
  'feed', 'hay', 'mineral', 'vet_call', 'labor', 'pasture_rent', 'trucking', 'interest', 'supplies', 'other'
);

-- ---------------------------------------------------------------------------------------------
-- Audit columns (§2): created_at, created_by, updated_at.
-- A signed-in user can't choose created_at/created_by; seeds (no auth.uid()) may.
-- ---------------------------------------------------------------------------------------------
create function private.set_audit_columns() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.created_at := now();
    else
      new.created_at := coalesce(new.created_at, now());
    end if;
    new.updated_at := new.created_at;
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Farm-local "today" (§2: dates are America/Chicago).
create function private.farm_today() returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'America/Chicago')::date $$;
grant execute on function private.farm_today() to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  -- Fever thresholds (§5.3), editable in farm settings.
  fever_temp_f numeric(4,1) not null default 104.0,
  sick_on_arrival_temp_f numeric(4,1) not null default 105.0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  check (sick_on_arrival_temp_f >= fever_temp_f)
);

create table public.farm_members (
  farm_id uuid not null references public.farms (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  primary key (farm_id, user_id)
);
create index farm_members_user_id_idx on public.farm_members (user_id);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  name text not null check (length(trim(name)) > 0),
  status public.lot_status not null default 'planned',
  sex public.lot_sex not null,
  risk_level public.risk_level not null,
  purchase_date date,
  source_type public.source_type,
  source_name text,
  head_purchased integer check (head_purchased >= 0),
  pay_weight_total_lb numeric(7,1) check (pay_weight_total_lb > 0),
  price_cents_per_cwt integer check (price_cents_per_cwt >= 0),
  freight_cents integer not null default 0 check (freight_cents >= 0),
  commission_cents integer not null default 0 check (commission_cents >= 0),
  other_purchase_cents integer not null default 0 check (other_purchase_cents >= 0),
  target_sale_date date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id)
);
create index lots_farm_id_status_idx on public.lots (farm_id, status);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  lot_id uuid not null,
  sale_date date not null,
  head integer not null check (head > 0),
  sale_weight_total_lb numeric(7,1) not null check (sale_weight_total_lb > 0),
  price_cents_per_cwt integer not null check (price_cents_per_cwt >= 0),
  commission_cents integer not null default 0 check (commission_cents >= 0),
  freight_cents integer not null default 0 check (freight_cents >= 0),
  checkoff_cents integer not null default 0 check (checkoff_cents >= 0),
  other_cents integer not null default 0 check (other_cents >= 0),
  buyer text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  foreign key (lot_id, farm_id) references public.lots (id, farm_id)
);
create index sales_farm_id_idx on public.sales (farm_id);
create index sales_lot_id_idx on public.sales (lot_id);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  lot_id uuid not null,
  visual_tag text not null check (length(visual_tag) > 0 and visual_tag = trim(visual_tag)),
  eid text,
  sex public.animal_sex,
  description text,
  status public.animal_status not null default 'active',
  arrival_date date,
  removal_date date,
  removal_reason text,
  sale_id uuid,
  is_replacement_candidate boolean not null default false,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  foreign key (lot_id, farm_id) references public.lots (id, farm_id),
  foreign key (sale_id, farm_id) references public.sales (id, farm_id),
  constraint animals_void_reason check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and length(trim(void_reason)) >= 5)
  )
);
-- §4: unique (farm_id, visual_tag) among active, non-voided animals (case-insensitive).
create unique index animals_active_tag_key on public.animals (farm_id, lower(visual_tag))
  where status = 'active' and voided_at is null;
create index animals_farm_id_status_idx on public.animals (farm_id, status);
create index animals_lot_id_idx on public.animals (lot_id);
create index animals_sale_id_idx on public.animals (sale_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  name text not null check (length(trim(name)) > 0),
  active_ingredient text,
  drug_class public.drug_class not null,
  is_antimicrobial boolean not null default false,
  rx_only boolean, -- null = not yet entered by the owner
  dose_basis public.dose_basis not null,
  dose_ml numeric(7,2) not null check (dose_ml > 0),
  unit public.product_unit not null default 'mL',
  route public.route not null,
  default_site text,
  max_ml_per_site numeric(7,2) check (max_ml_per_site > 0),
  slaughter_withdrawal_days integer not null check (slaughter_withdrawal_days >= 0),
  post_metaphylaxis_interval_days integer check (post_metaphylaxis_interval_days > 0),
  needs_label_verification boolean not null default true,
  human_safety_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  unique (farm_id, name)
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  product_id uuid not null,
  lot_number text not null check (length(trim(lot_number)) > 0),
  serial_number text,
  expiration_date date not null,
  size_ml numeric(7,2) not null check (size_ml > 0), -- a count for `each` products
  remaining_ml numeric(7,2) not null,
  cost_cents integer not null check (cost_cents >= 0),
  opened_at timestamptz,
  status public.inventory_status not null default 'in_stock',
  discarded_at timestamptz,
  discard_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  unique (id, product_id),
  foreign key (product_id, farm_id) references public.products (id, farm_id),
  check (remaining_ml >= 0 and remaining_ml <= size_ml),
  check (status <> 'discarded' or length(trim(discard_reason)) > 0)
);
create index inventory_items_farm_id_status_idx on public.inventory_items (farm_id, status);
create index inventory_items_product_id_idx on public.inventory_items (product_id);

create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  name text not null check (length(trim(name)) > 0),
  kind public.protocol_kind not null,
  -- Versions of one protocol share a family_id (§8.6: edits after use create a new version).
  family_id uuid not null default gen_random_uuid(),
  version integer not null default 1 check (version >= 1),
  active boolean not null default true,
  approved_by text,
  approved_on date,
  nsaid_temp_threshold_f numeric(4,1) not null default 104.0,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  unique (family_id, version)
);
create index protocols_farm_id_idx on public.protocols (farm_id);
create unique index protocols_one_active_version on public.protocols (family_id) where active;

create table public.protocol_steps (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  protocol_id uuid not null,
  sequence integer not null check (sequence >= 1),
  product_id uuid not null,
  -- Processing protocols: which session kind the step belongs to (null = every session).
  session_kind public.session_kind,
  -- Treatment protocols: 1, 2, 3…
  pull_number integer check (pull_number >= 1),
  applies_to public.applies_to not null default 'all',
  conditional public.step_conditional not null default 'none',
  required boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  foreign key (protocol_id, farm_id) references public.protocols (id, farm_id),
  foreign key (product_id, farm_id) references public.products (id, farm_id),
  unique nulls not distinct (protocol_id, session_kind, pull_number, sequence)
);
create index protocol_steps_farm_id_idx on public.protocol_steps (farm_id);
create index protocol_steps_product_id_idx on public.protocol_steps (product_id);

create table public.processing_sessions (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  lot_id uuid not null,
  protocol_id uuid not null,
  session_date date not null default private.farm_today(),
  kind public.session_kind not null,
  crew text,
  status public.session_status not null default 'open',
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  foreign key (lot_id, farm_id) references public.lots (id, farm_id),
  foreign key (protocol_id, farm_id) references public.protocols (id, farm_id)
);
create index processing_sessions_farm_id_status_idx on public.processing_sessions (farm_id, status);
create index processing_sessions_lot_id_idx on public.processing_sessions (lot_id);
create index processing_sessions_protocol_id_idx on public.processing_sessions (protocol_id);

-- Which bottle is in use for each product in a session; updated when a bottle is changed.
create table public.session_bottles (
  session_id uuid not null,
  product_id uuid not null,
  inventory_item_id uuid not null,
  farm_id uuid not null references public.farms (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  primary key (session_id, product_id),
  foreign key (session_id, farm_id) references public.processing_sessions (id, farm_id),
  foreign key (product_id, farm_id) references public.products (id, farm_id),
  foreign key (inventory_item_id, farm_id) references public.inventory_items (id, farm_id),
  foreign key (inventory_item_id, product_id) references public.inventory_items (id, product_id)
);
create index session_bottles_farm_id_idx on public.session_bottles (farm_id);
create index session_bottles_product_id_idx on public.session_bottles (product_id);
create index session_bottles_inventory_item_id_idx on public.session_bottles (inventory_item_id);

-- One calf through the chute in one session. id is client-generated (§7).
create table public.processing_events (
  id uuid primary key,
  farm_id uuid not null references public.farms (id),
  session_id uuid not null,
  animal_id uuid not null,
  temp_f numeric(4,1) check (temp_f between 90.0 and 115.0),
  tape_weight_lb numeric(7,1) check (tape_weight_lb > 0),
  dose_weight_lb numeric(7,1) check (dose_weight_lb > 0 and mod(dose_weight_lb, 50) = 0),
  dose_weight_source public.dose_weight_source,
  recorded_by uuid default auth.uid(),
  recorded_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  unique (id, animal_id),
  foreign key (session_id, farm_id) references public.processing_sessions (id, farm_id),
  foreign key (animal_id, farm_id) references public.animals (id, farm_id),
  check ((dose_weight_lb is null) = (dose_weight_source is null)),
  constraint processing_events_void_reason check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and length(trim(void_reason)) >= 5)
  )
);
create index processing_events_farm_id_idx on public.processing_events (farm_id);
create index processing_events_animal_id_idx on public.processing_events (animal_id);
-- A calf goes through a session once (a re-run needs the first event voided).
create unique index processing_events_one_per_session on public.processing_events (session_id, animal_id)
  where voided_at is null;

-- A pull. id is client-generated (§7). pull_number is computed at insert (§5.4).
create table public.treatments (
  id uuid primary key,
  farm_id uuid not null references public.farms (id),
  animal_id uuid not null,
  pulled_at timestamptz not null default now(),
  signs text[] not null default '{}' check (signs <@ array['D', 'A', 'R', 'other']::text[]),
  temp_f numeric(4,1) check (temp_f between 90.0 and 115.0),
  est_weight_lb numeric(7,1) check (est_weight_lb > 0),
  diagnosis public.diagnosis not null,
  pull_number integer not null check (pull_number >= 1),
  protocol_id uuid,
  metaphylaxis_warning_ack boolean not null default false,
  recheck_date date,
  outcome public.treatment_outcome not null default 'pending',
  given_by uuid default auth.uid(),
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  unique (id, farm_id),
  unique (id, animal_id),
  foreign key (animal_id, farm_id) references public.animals (id, farm_id),
  foreign key (protocol_id, farm_id) references public.protocols (id, farm_id),
  constraint treatments_void_reason check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and length(trim(void_reason)) >= 5)
  )
);
create index treatments_farm_id_outcome_idx on public.treatments (farm_id, outcome);
create index treatments_animal_id_idx on public.treatments (animal_id);
create index treatments_protocol_id_idx on public.treatments (protocol_id);
create index treatments_rechecks_idx on public.treatments (farm_id, recheck_date)
  where voided_at is null and outcome = 'pending';

-- Every dose given, from any source. id is client-generated (§7).
create table public.administrations (
  id uuid primary key,
  farm_id uuid not null references public.farms (id),
  animal_id uuid not null,
  product_id uuid not null,
  inventory_item_id uuid,
  dose_ml numeric(7,2) check (dose_ml > 0),
  sites integer not null default 1 check (sites >= 1),
  route public.route not null,
  site text,
  given_at timestamptz not null default now(),
  given_by uuid default auth.uid(),
  source public.administration_source not null,
  processing_event_id uuid,
  treatment_id uuid,
  skipped boolean not null default false,
  skip_reason text,
  -- Snapshots, set by trigger at insert (§4, §5.5, §5.6).
  cost_cents integer not null default 0 check (cost_cents >= 0),
  withdrawal_clear_date date,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  foreign key (animal_id, farm_id) references public.animals (id, farm_id),
  foreign key (product_id, farm_id) references public.products (id, farm_id),
  foreign key (inventory_item_id, farm_id) references public.inventory_items (id, farm_id),
  foreign key (inventory_item_id, product_id) references public.inventory_items (id, product_id),
  foreign key (processing_event_id, farm_id) references public.processing_events (id, farm_id),
  foreign key (processing_event_id, animal_id) references public.processing_events (id, animal_id),
  foreign key (treatment_id, farm_id) references public.treatments (id, farm_id),
  foreign key (treatment_id, animal_id) references public.treatments (id, animal_id),
  constraint administrations_source_link check (
    (source = 'processing' and processing_event_id is not null and treatment_id is null)
    or (source = 'treatment' and treatment_id is not null and processing_event_id is null)
  ),
  -- A given dose needs a bottle and a volume; a skipped step records the reason and no bottle.
  constraint administrations_given_or_skipped check (
    (not skipped and inventory_item_id is not null and dose_ml is not null and skip_reason is null)
    or (skipped and inventory_item_id is null and length(trim(skip_reason)) > 0)
  ),
  constraint administrations_void_reason check (
    (voided_at is null and void_reason is null)
    or (voided_at is not null and length(trim(void_reason)) >= 5)
  )
);
create index administrations_farm_id_idx on public.administrations (farm_id);
create index administrations_animal_id_idx on public.administrations (animal_id);
create index administrations_product_id_idx on public.administrations (product_id);
create index administrations_inventory_item_id_idx on public.administrations (inventory_item_id);
create index administrations_processing_event_id_idx on public.administrations (processing_event_id);
create index administrations_treatment_id_idx on public.administrations (treatment_id);

create table public.deaths (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  animal_id uuid not null unique,
  died_on date not null,
  suspected_cause text,
  necropsy_done boolean not null default false,
  necropsy_findings text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  foreign key (animal_id, farm_id) references public.animals (id, farm_id)
);
create index deaths_farm_id_idx on public.deaths (farm_id);

create table public.lot_costs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id),
  lot_id uuid not null,
  cost_date date not null,
  category public.cost_category not null,
  amount_cents integer not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  foreign key (lot_id, farm_id) references public.lots (id, farm_id)
);
create index lot_costs_farm_id_idx on public.lot_costs (farm_id);
create index lot_costs_lot_id_idx on public.lot_costs (lot_id);

-- Audit trigger on every table.
do $$
declare t text;
begin
  foreach t in array array[
    'farms', 'farm_members', 'lots', 'sales', 'animals', 'products', 'inventory_items', 'protocols',
    'protocol_steps', 'processing_sessions', 'session_bottles', 'processing_events', 'treatments',
    'administrations', 'deaths', 'lot_costs'
  ] loop
    execute format(
      'create trigger set_audit_columns before insert or update on public.%I
         for each row execute function private.set_audit_columns()', t);
  end loop;
end;
$$;
