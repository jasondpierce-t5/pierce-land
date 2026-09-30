-- M2.5: the DB snapshot triggers agree with the TypeScript domain functions, case for case,
-- using the same fixtures (tests/fixtures/withdrawal.json, administration_cost.json).
begin;
\ir _helpers.psql
\ir _fixtures.psql
select plan(2);
select tests.seed_basic();

-- One animal, processing event, product, bottle, and dose per fixture case.
create temp table actual_withdrawal (n integer, clear_date date) on commit drop;
create temp table actual_cost (n integer, cost_cents integer) on commit drop;

do $$
declare
  c record;
  v_animal uuid; v_event uuid; v_product uuid; v_bottle uuid; v_admin uuid;
begin
  for c in
    select 'w' as kind, n, given_at, slaughter_withdrawal_days as wd, 1::numeric as dose_ml, 0 as cost_cents, 10::numeric as size_ml
      from fx_withdrawal
    union all
    select 'c', n, '2026-10-01T15:00:00Z'::timestamptz, 0, dose_ml, cost_cents, size_ml
      from fx_cost
  loop
    v_animal := gen_random_uuid(); v_event := gen_random_uuid(); v_product := gen_random_uuid();
    v_bottle := gen_random_uuid(); v_admin := gen_random_uuid();

    insert into public.animals (id, farm_id, lot_id, visual_tag)
    values (v_animal, tests.id('farm'), tests.id('lot'), 'FX-' || c.kind || c.n);
    insert into public.processing_events (id, farm_id, session_id, animal_id)
    values (v_event, tests.id('farm'), tests.id('session'), v_animal);
    insert into public.products (id, farm_id, name, drug_class, dose_basis, dose_ml, route, slaughter_withdrawal_days)
    values (v_product, tests.id('farm'), 'FX product ' || c.kind || c.n, 'other', 'per_head', 1, 'SC', c.wd);
    insert into public.inventory_items (id, farm_id, product_id, lot_number, expiration_date, size_ml, cost_cents)
    values (v_bottle, tests.id('farm'), v_product, 'FX', '2099-12-31', c.size_ml, c.cost_cents);
    insert into public.administrations (id, farm_id, animal_id, product_id, inventory_item_id, dose_ml, route,
                                        given_at, source, processing_event_id)
    values (v_admin, tests.id('farm'), v_animal, v_product, v_bottle, c.dose_ml, 'SC', c.given_at, 'processing', v_event);

    if c.kind = 'w' then
      insert into actual_withdrawal select c.n, withdrawal_clear_date from public.administrations where id = v_admin;
    else
      insert into actual_cost select c.n, cost_cents from public.administrations where id = v_admin;
    end if;
  end loop;
end;
$$;

select results_eq(
  'select n, clear_date from actual_withdrawal order by n',
  'select n, expected_clear_date from fx_withdrawal order by n',
  'withdrawal_clear_date matches withdrawalClearDate() for every fixture case'
);
select results_eq(
  'select n, cost_cents from actual_cost order by n',
  'select n, expected_cost_cents from fx_cost order by n',
  'cost_cents matches administrationCostCents() for every fixture case'
);

select * from finish();
rollback;
