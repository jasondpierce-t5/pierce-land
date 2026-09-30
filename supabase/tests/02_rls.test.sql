-- M1.2: RLS per §3 — members read, non-members read nothing, vets never write, hands can't edit
-- owner-only tables, and nobody can DELETE the protected tables.
begin;
\ir _helpers.psql
select plan(115);
select tests.seed_basic();

-- ---------------------------------------------------------------------------------------------
-- RLS is on for every table.
-- ---------------------------------------------------------------------------------------------
select is(
  (select array_agg(c.relname::text order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'RLS is enabled on every public table'
);

-- A count helper that runs as the current role (so RLS applies).
create function tests.visible(p_table text, p_farm uuid) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from public.%I where %I = $1', p_table,
                 case when p_table = 'farms' then 'id' else 'farm_id' end)
    into n using p_farm;
  return n;
end;
$$;
grant execute on function tests.visible(text, uuid) to anon, authenticated;

create temp table all_tables (t text) on commit drop;
insert into all_tables values
  ('farms'), ('farm_members'), ('lots'), ('animals'), ('products'), ('inventory_items'), ('protocols'),
  ('protocol_steps'), ('processing_sessions'), ('session_bottles'), ('processing_events'),
  ('administrations'), ('treatments'), ('deaths'), ('lot_costs'), ('sales');
grant select on all_tables to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('vet');
select cmp_ok(tests.visible(t, tests.id('farm')), '>', 0::bigint, format('a vet (member) reads %s', t))
from all_tables order by t;

select tests.authenticate_as('outsider');
select is(tests.visible(t, tests.id('farm')), 0::bigint, format('a member of another farm reads 0 %s', t))
from all_tables order by t;

select tests.authenticate_as('nobody');
select is(tests.visible(t, tests.id('farm')), 0::bigint, format('a non-member reads 0 %s', t))
from all_tables order by t;

select tests.as_anon();
select is(
  (select array_agg(t order by t) from all_tables where has_table_privilege('anon', 'public.' || t, 'SELECT')),
  null,
  'anon has no table privileges at all'
);
select tests.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- Vets can't insert anything.
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('vet');
select throws_ok($$ insert into public.farms (name) values ('Vet Farm') $$, '42501', null, 'vet cannot insert farms');
select throws_ok(format($$ insert into public.farm_members (farm_id, user_id, role) values (%L, %L, 'owner') $$,
  tests.id('farm'), tests.id('nobody')), '42501', null, 'vet cannot insert farm_members');
select throws_ok(format($$ insert into public.lots (farm_id, name, sex, risk_level) values (%L, 'Vet Lot', 'steer', 'low') $$,
  tests.id('farm')), '42501', null, 'vet cannot insert lots');
select throws_ok(format($$ insert into public.animals (farm_id, lot_id, visual_tag) values (%L, %L, '999') $$,
  tests.id('farm'), tests.id('lot')), '42501', null, 'vet cannot insert animals');
select throws_ok(format($$ insert into public.products (farm_id, name, drug_class, dose_basis, dose_ml, route, slaughter_withdrawal_days)
  values (%L, 'Vet Product', 'other', 'per_head', 1, 'SC', 0) $$, tests.id('farm')), '42501', null, 'vet cannot insert products');
select throws_ok(format($$ insert into public.inventory_items (farm_id, product_id, lot_number, expiration_date, size_ml, remaining_ml, cost_cents)
  values (%L, %L, 'X', '2099-01-01', 100, 100, 100) $$, tests.id('farm'), tests.id('product')), '42501', null, 'vet cannot insert inventory_items');
select throws_ok(format($$ insert into public.protocols (farm_id, name, kind) values (%L, 'Vet Protocol', 'treatment') $$,
  tests.id('farm')), '42501', null, 'vet cannot insert protocols');
select throws_ok(format($$ insert into public.protocol_steps (farm_id, protocol_id, sequence, product_id) values (%L, %L, 9, %L) $$,
  tests.id('farm'), tests.id('protocol'), tests.id('product')), '42501', null, 'vet cannot insert protocol_steps');
select throws_ok(format($$ insert into public.processing_sessions (farm_id, lot_id, protocol_id, kind) values (%L, %L, %L, 'booster') $$,
  tests.id('farm'), tests.id('lot'), tests.id('protocol')), '42501', null, 'vet cannot insert processing_sessions');
select throws_ok(format($$ insert into public.session_bottles (session_id, product_id, inventory_item_id, farm_id) values (%L, %L, %L, %L) $$,
  tests.id('session'), tests.id('product'), tests.id('bottle'), tests.id('farm')), '42501', null, 'vet cannot insert session_bottles');
select throws_ok(format($$ insert into public.processing_events (id, farm_id, session_id, animal_id) values (gen_random_uuid(), %L, %L, %L) $$,
  tests.id('farm'), tests.id('session'), tests.id('animal_dead')), '42501', null, 'vet cannot insert processing_events');
select throws_ok(format($$ insert into public.administrations (id, farm_id, animal_id, product_id, route, source, processing_event_id, skipped, skip_reason)
  values (gen_random_uuid(), %L, %L, %L, 'SC', 'processing', %L, true, 'not needed') $$,
  tests.id('farm'), tests.id('animal'), tests.id('product'), tests.id('event')), '42501', null, 'vet cannot insert administrations');
select throws_ok(format($$ insert into public.treatments (id, farm_id, animal_id, diagnosis, pull_number) values (gen_random_uuid(), %L, %L, 'pinkeye', 1) $$,
  tests.id('farm'), tests.id('animal')), '42501', null, 'vet cannot insert treatments');
select throws_ok(format($$ insert into public.deaths (farm_id, animal_id, died_on) values (%L, %L, '2026-11-01') $$,
  tests.id('farm'), tests.id('animal')), '42501', null, 'vet cannot insert deaths');
select throws_ok(format($$ insert into public.lot_costs (farm_id, lot_id, cost_date, category, amount_cents) values (%L, %L, '2026-11-01', 'feed', 100) $$,
  tests.id('farm'), tests.id('lot')), '42501', null, 'vet cannot insert lot_costs');
select throws_ok(format($$ insert into public.sales (farm_id, lot_id, sale_date, head, sale_weight_total_lb, price_cents_per_cwt)
  values (%L, %L, '2027-03-01', 1, 600, 30000) $$, tests.id('farm'), tests.id('lot')), '42501', null, 'vet cannot insert sales');

-- Vets can't update anything either (RLS filters the rows, so nothing changes).
select is_empty(format($$ update public.lots set notes = 'vet' where id = %L returning id $$, tests.id('lot')),
  'vet cannot update lots');
select is_empty(format($$ update public.animals set description = 'vet' where id = %L returning id $$, tests.id('animal')),
  'vet cannot update animals');
select is_empty(format($$ update public.treatments set notes = 'vet' where id = %L returning id $$, tests.id('treatment')),
  'vet cannot update treatments');

-- ---------------------------------------------------------------------------------------------
-- Hands work the cattle but can't edit products, protocols, costs, sales, members, or the farm.
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('hand');
select lives_ok(format($$ insert into public.lots (farm_id, name, sex, risk_level) values (%L, 'Hand Lot', 'steer', 'low') $$,
  tests.id('farm')), 'hand can insert lots');
select lives_ok(format($$ insert into public.animals (farm_id, lot_id, visual_tag) values (%L, %L, '201') $$,
  tests.id('farm'), tests.id('lot')), 'hand can insert animals');
select lives_ok(format($$ update public.treatments set outcome = 'recovered' where id = %L $$, tests.id('treatment')),
  'hand can record a treatment outcome');
select lives_ok(format($$ insert into public.inventory_items (farm_id, product_id, lot_number, expiration_date, size_ml, remaining_ml, cost_cents)
  values (%L, %L, 'HAND-1', '2099-01-01', 100, 100, 100) $$, tests.id('farm'), tests.id('product')), 'hand can add a bottle');

select throws_ok(format($$ insert into public.products (farm_id, name, drug_class, dose_basis, dose_ml, route, slaughter_withdrawal_days)
  values (%L, 'Hand Product', 'other', 'per_head', 1, 'SC', 0) $$, tests.id('farm')), '42501', null, 'hand cannot insert products');
select is_empty(format($$ update public.products set dose_ml = 9 where id = %L returning id $$, tests.id('product')),
  'hand cannot update products');
select throws_ok(format($$ insert into public.protocols (farm_id, name, kind) values (%L, 'Hand Protocol', 'treatment') $$,
  tests.id('farm')), '42501', null, 'hand cannot insert protocols');
select is_empty(format($$ update public.protocols set approved_by = 'hand' where id = %L returning id $$, tests.id('protocol')),
  'hand cannot update protocols');
select throws_ok(format($$ insert into public.protocol_steps (farm_id, protocol_id, sequence, product_id) values (%L, %L, 9, %L) $$,
  tests.id('farm'), tests.id('protocol'), tests.id('product')), '42501', null, 'hand cannot insert protocol_steps');
select is_empty(format($$ update public.protocol_steps set required = false where id = %L returning id $$, tests.id('step')),
  'hand cannot update protocol_steps');
select is_empty(format($$ delete from public.protocol_steps where id = %L returning id $$, tests.id('step')),
  'hand cannot delete protocol_steps');
select throws_ok(format($$ insert into public.lot_costs (farm_id, lot_id, cost_date, category, amount_cents) values (%L, %L, '2026-11-01', 'feed', 100) $$,
  tests.id('farm'), tests.id('lot')), '42501', null, 'hand cannot insert lot_costs');
select is_empty(format($$ update public.lot_costs set amount_cents = 1 where id = %L returning id $$, tests.id('lot_cost')),
  'hand cannot update lot_costs');
select throws_ok(format($$ insert into public.sales (farm_id, lot_id, sale_date, head, sale_weight_total_lb, price_cents_per_cwt)
  values (%L, %L, '2027-03-01', 1, 600, 30000) $$, tests.id('farm'), tests.id('lot')), '42501', null, 'hand cannot insert sales');
select is_empty(format($$ update public.sales set price_cents_per_cwt = 1 where id = %L returning id $$, tests.id('sale')),
  'hand cannot update sales');
select throws_ok(format($$ insert into public.farm_members (farm_id, user_id, role) values (%L, %L, 'owner') $$,
  tests.id('farm'), tests.id('nobody')), '42501', null, 'hand cannot add members');
select is_empty(format($$ update public.farm_members set role = 'owner' where user_id = %L returning user_id $$, tests.id('hand')),
  'hand cannot promote themselves');
select is_empty(format($$ update public.farms set name = 'Hand Farm' where id = %L returning id $$, tests.id('farm')),
  'hand cannot edit the farm');

-- Hands can't write into another farm.
select throws_ok(format($$ insert into public.lots (farm_id, name, sex, risk_level) values (%L, 'Sneaky', 'steer', 'low') $$,
  tests.id('other_farm')), '42501', null, 'hand cannot insert into another farm');

-- ---------------------------------------------------------------------------------------------
-- Owners manage the owner-only tables.
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('owner');
select isnt_empty(format($$ update public.products set needs_label_verification = false where id = %L returning id $$, tests.id('product')),
  'owner can update products');
select isnt_empty(format($$ update public.protocols set approved_by = 'Dr. Test', approved_on = '2026-10-01' where id = %L returning id $$,
  tests.id('protocol')), 'owner can update protocols');
select isnt_empty(format($$ update public.lot_costs set amount_cents = 130000 where id = %L returning id $$, tests.id('lot_cost')),
  'owner can update lot_costs');
select isnt_empty(format($$ delete from public.lot_costs where id = %L returning id $$, tests.id('lot_cost')),
  'owner can delete lot_costs');
select isnt_empty(format($$ update public.farms set fever_temp_f = 103.5 where id = %L returning id $$, tests.id('farm')),
  'owner can edit farm settings');
select lives_ok(format($$ insert into public.farm_members (farm_id, user_id, role, display_name) values (%L, %L, 'hand', 'New Hand') $$,
  tests.id('farm'), tests.id('nobody')), 'owner can add a member');
select throws_ok($$ insert into public.farms (name) values ('Owner Farm') $$, '42501', null,
  'farms are not created through the API');

-- ---------------------------------------------------------------------------------------------
-- Nobody can DELETE the protected tables (§3), not even the owner or the service role.
-- ---------------------------------------------------------------------------------------------
select ok(not has_table_privilege(r, 'public.' || t, 'DELETE'), format('%s has no DELETE on %s', r, t))
from unnest(array['authenticated', 'anon', 'service_role']) r,
     unnest(array['administrations', 'treatments', 'processing_events', 'animals']) t;

select tests.authenticate_as('owner');
select throws_ok(format($$ delete from public.%I where id = %L $$, t, tests.id(k)), '42501', null,
  format('owner cannot delete %s', t))
from (values ('administrations', 'admin'), ('treatments', 'treatment'), ('processing_events', 'event'),
             ('animals', 'animal')) v(t, k);
select tests.authenticate_as('hand');
select throws_ok(format($$ delete from public.%I where id = %L $$, t, tests.id(k)), '42501', null,
  format('hand cannot delete %s', t))
from (values ('administrations', 'admin'), ('treatments', 'treatment'), ('processing_events', 'event'),
             ('animals', 'animal')) v(t, k);

select tests.as_postgres();
select * from finish();
rollback;
