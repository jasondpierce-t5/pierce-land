-- M1.1: every §4 table, enum, audit column, FK index, and the updated_at trigger.
begin;
create extension if not exists pgtap with schema extensions;
select plan(65);

-- Tables
select has_table('public', t, format('table %s exists', t))
from unnest(array[
  'farms', 'farm_members', 'lots', 'animals', 'products', 'inventory_items', 'protocols',
  'protocol_steps', 'processing_sessions', 'session_bottles', 'processing_events',
  'administrations', 'treatments', 'deaths', 'lot_costs', 'sales'
]) as t;

-- Every public table has farm_id (or is farms) and the audit columns.
select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'farms'
      and not exists (select 1 from information_schema.columns i
                       where i.table_schema = 'public' and i.table_name = c.relname and i.column_name = 'farm_id')),
  null,
  'every table except farms has farm_id'
);
select is(
  (select array_agg(format('%s.%s', t.relname, col) order by t.relname, col)
     from pg_class t join pg_namespace n on n.oid = t.relnamespace
     cross join unnest(array['created_at', 'created_by', 'updated_at']) as col
    where n.nspname = 'public' and t.relkind = 'r'
      and not exists (select 1 from information_schema.columns i
                       where i.table_schema = 'public' and i.table_name = t.relname and i.column_name = col)),
  null,
  'every table has created_at, created_by, updated_at'
);
select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = 'set_audit_columns')),
  null,
  'every table has the set_audit_columns trigger'
);

-- Every single-column FK is indexed (leading column of some index).
select is(
  (select array_agg(format('%s(%s)', con.conrelid::regclass, a.attname) order by 1)
     from pg_constraint con
     join pg_namespace n on n.oid = con.connamespace and n.nspname = 'public'
     join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
    where con.contype = 'f'
      and not exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indkey[0] = con.conkey[1])),
  null,
  'every foreign key has an index on its leading column'
);

-- Enums match §4 and src/lib/domain/types.ts
select enum_has_labels('public', 'member_role', array['owner', 'hand', 'vet']);
select enum_has_labels('public', 'lot_status', array['planned', 'receiving', 'active', 'closed']);
select enum_has_labels('public', 'lot_sex', array['heifer', 'steer', 'mixed']);
select enum_has_labels('public', 'risk_level', array['high', 'moderate', 'low']);
select enum_has_labels('public', 'source_type', array['sale_barn', 'ranch_direct', 'order_buyer', 'other']);
select enum_has_labels('public', 'animal_status', array['active', 'sold', 'dead', 'removed']);
select enum_has_labels('public', 'animal_sex', array['heifer', 'steer', 'bull']);
select enum_has_labels('public', 'drug_class', array[
  'macrolide', 'phenicol', 'fluoroquinolone', 'cephalosporin', 'tetracycline', 'vaccine_mlv_resp',
  'vaccine_intranasal', 'vaccine_clostridial', 'anthelmintic_ml', 'anthelmintic_bz', 'prostaglandin',
  'nsaid', 'implant', 'other']);
select enum_has_labels('public', 'dose_basis', array['per_100lb', 'per_head']);
select enum_has_labels('public', 'product_unit', array['mL', 'each']);
select enum_has_labels('public', 'route', array['SC', 'IM', 'IV', 'oral', 'intranasal', 'pour_on', 'implant', 'topical']);
select enum_has_labels('public', 'inventory_status', array['in_stock', 'open', 'empty', 'expired', 'discarded']);
select enum_has_labels('public', 'protocol_kind', array['processing', 'treatment']);
select enum_has_labels('public', 'applies_to', array['all', 'heifers', 'feeders_only']);
select enum_has_labels('public', 'step_conditional', array['none', 'temp_gte_threshold']);
select enum_has_labels('public', 'session_kind', array['arrival', 'booster', 'other']);
select enum_has_labels('public', 'session_status', array['open', 'closed']);
select enum_has_labels('public', 'dose_weight_source', array['event_tape', 'recent_tape', 'lot_average']);
select enum_has_labels('public', 'administration_source', array['processing', 'treatment']);
select enum_has_labels('public', 'diagnosis', array['brd', 'footrot', 'pinkeye', 'other']);
select enum_has_labels('public', 'treatment_outcome', array['pending', 'recovered', 'chronic', 'died', 'removed']);
select enum_has_labels('public', 'cost_category', array[
  'feed', 'hay', 'mineral', 'vet_call', 'labor', 'pasture_rent', 'trucking', 'interest', 'supplies', 'other']);

-- Units (§2)
select col_type_is('public', 'lots', 'pay_weight_total_lb', 'numeric(7,1)', 'weights are numeric(7,1) lb');
select col_type_is('public', 'products', 'dose_ml', 'numeric(7,2)', 'volumes are numeric(7,2) mL');
select col_type_is('public', 'inventory_items', 'remaining_ml', 'numeric(7,2)', 'remaining is numeric(7,2) mL');
select col_type_is('public', 'processing_events', 'temp_f', 'numeric(4,1)', 'temps are numeric(4,1) °F');
select col_type_is('public', 'administrations', 'cost_cents', 'integer', 'money is integer cents');
select is(
  (select array_agg(format('%s.%s %s', table_name, column_name, data_type) order by 1)
     from information_schema.columns
    where table_schema = 'public' and column_name like '%cents%' and data_type <> 'integer'),
  null,
  'every *_cents column is an integer'
);

-- Client-generated ids for chute and sick-pen records (§2, §7)
select col_is_pk('public', 'processing_events', 'id', 'processing_events.id is the PK');
select col_is_pk('public', 'administrations', 'id', 'administrations.id is the PK');
select col_is_pk('public', 'treatments', 'id', 'treatments.id is the PK');

-- Key constraints
select has_index('public', 'animals', 'animals_active_tag_key', 'unique active tag index exists');
select col_is_unique('public', 'deaths', 'animal_id', 'one death per animal');
select has_check('public', 'administrations', 'administrations have check constraints');

-- Void columns on the voidable tables
select has_column('public', t, 'voided_at', format('%s.voided_at', t))
from unnest(array['animals', 'processing_events', 'administrations', 'treatments']) as t;
select has_column('public', t, 'void_reason', format('%s.void_reason', t))
from unnest(array['animals', 'processing_events', 'administrations', 'treatments']) as t;

-- Audit trigger behaviour
insert into public.farms (id, name, created_at) values
  ('f0000000-0000-4000-8000-00000000aaaa', 'Schema Test Farm', '2020-01-01T00:00:00Z');
select is(
  (select created_at from public.farms where id = 'f0000000-0000-4000-8000-00000000aaaa'),
  '2020-01-01T00:00:00Z'::timestamptz,
  'without a signed-in user, an explicit created_at is kept (seeds)'
);
update public.farms set name = 'Renamed', created_at = now() where id = 'f0000000-0000-4000-8000-00000000aaaa';
select is(
  (select created_at from public.farms where id = 'f0000000-0000-4000-8000-00000000aaaa'),
  '2020-01-01T00:00:00Z'::timestamptz,
  'created_at cannot be changed by an update'
);
select ok(
  (select updated_at > '2020-01-01T00:00:00Z' from public.farms where id = 'f0000000-0000-4000-8000-00000000aaaa'),
  'updated_at is bumped on update'
);

select * from finish();
rollback;
