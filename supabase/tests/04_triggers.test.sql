-- M1.3: inventory decrement/restore (§5.6, §6), cost and withdrawal snapshots (§4, §5.5),
-- animal status from deaths and sales (§4), pull number (§5.4), metaphylaxis acknowledgement.
begin;
\ir _helpers.psql
select plan(48);
select tests.seed_basic();

-- A fresh 500 mL, $320.00 bottle; seed_basic already used 10 mL of 'bottle'.
insert into public.inventory_items (id, farm_id, product_id, lot_number, expiration_date, size_ml, cost_cents)
values (tests.remember('fresh', gen_random_uuid()), tests.id('farm'), tests.id('product'), 'LOT-2', '2099-12-31', 500, 32000);
select is((select remaining_ml from public.inventory_items where id = tests.id('fresh')), 500.00::numeric,
  'a new bottle starts full when remaining_ml is omitted');
select is((select status from public.inventory_items where id = tests.id('fresh')), 'in_stock'::public.inventory_status,
  'and in stock');

insert into public.animals (id, farm_id, lot_id, visual_tag) values
  (tests.remember('calf', gen_random_uuid()), tests.id('farm'), tests.id('lot'), '401');
insert into public.processing_events (id, farm_id, session_id, animal_id)
values (tests.remember('calf_event', gen_random_uuid()), tests.id('farm'), tests.id('session'), tests.id('calf'));

-- A dose as a hand would send it from the chute (client id, upsert-ignore).
create function tests.dose(p_key text, p_bottle text, p_ml numeric, p_at timestamptz default '2026-10-01T15:00:00Z')
returns void language sql as $$
  insert into public.administrations (id, farm_id, animal_id, product_id, inventory_item_id, dose_ml, route, site,
                                      given_at, source, processing_event_id, cost_cents, withdrawal_clear_date)
  values (tests.remember(p_key, coalesce((select id from tests.ids where key = p_key), gen_random_uuid())),
          tests.id('farm'), tests.id('calf'), tests.id('product'), tests.id(p_bottle), p_ml, 'SC', 'neck',
          p_at, 'processing', tests.id('calf_event'), 999999, '1999-01-01')
  on conflict (id) do nothing
$$;
grant execute on function tests.dose(text, text, numeric, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Decrement, open, snapshots
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('hand');
select lives_ok($$ select tests.dose('d1', 'fresh', 5.5, '2026-10-02T03:30:00Z') $$, 'a hand records a 5.5 mL dose');
select tests.as_postgres();
select is((select remaining_ml from public.inventory_items where id = tests.id('fresh')), 494.50::numeric,
  'the bottle is decremented');
select is((select status from public.inventory_items where id = tests.id('fresh')), 'open'::public.inventory_status,
  'the first dose opens the bottle');
select is((select opened_at from public.inventory_items where id = tests.id('fresh')), '2026-10-02T03:30:00Z'::timestamptz,
  'opened_at is the first dose time');
select is((select cost_cents from public.administrations where id = tests.id('d1')), 352,
  'cost_cents is snapshotted from the bottle (client value ignored)');
select is((select withdrawal_clear_date from public.administrations where id = tests.id('d1')), '2026-10-19'::date,
  'withdrawal_clear_date uses the Chicago date of given_at + withdrawal days (client value ignored)');

-- Idempotent retry: same id again
select tests.authenticate_as('hand');
select lives_ok($$ select tests.dose('d1', 'fresh', 5.5, '2026-10-02T03:30:00Z') $$, 'retrying the same dose is accepted');
select tests.as_postgres();
select is((select remaining_ml from public.inventory_items where id = tests.id('fresh')), 494.50::numeric,
  'a retried dose does not decrement twice');
select is((select count(*)::int from public.administrations where id = tests.id('d1')), 1, 'and there is one row');

select tests.dose('d2', 'fresh', 10, '2026-10-05T15:00:00Z');
select is((select opened_at from public.inventory_items where id = tests.id('fresh')), '2026-10-02T03:30:00Z'::timestamptz,
  'later doses keep the original opened_at');

-- Empty the bottle exactly
select tests.dose('d3', 'fresh', 484.5);
select is((select remaining_ml from public.inventory_items where id = tests.id('fresh')), 0.00::numeric, 'down to 0 mL');
select is((select status from public.inventory_items where id = tests.id('fresh')), 'empty'::public.inventory_status,
  'hitting 0 mL empties the bottle');

-- ---------------------------------------------------------------------------------------------
-- Blocked bottles (§5.6)
-- ---------------------------------------------------------------------------------------------
select throws_ok($$ select tests.dose('d4', 'fresh', 1) $$, 'PLB02', null, 'no dose from an empty bottle');

insert into public.inventory_items (id, farm_id, product_id, lot_number, expiration_date, size_ml, cost_cents) values
  (tests.remember('expired', gen_random_uuid()), tests.id('farm'), tests.id('product'), 'OLD', '2026-09-30', 100, 5000),
  (tests.remember('low', gen_random_uuid()), tests.id('farm'), tests.id('product'), 'LOW', '2099-01-01', 100, 5000),
  (tests.remember('gone', gen_random_uuid()), tests.id('farm'), tests.id('product'), 'GONE', '2099-01-01', 100, 5000);
update public.inventory_items set remaining_ml = 3 where id = tests.id('low');
update public.inventory_items set status = 'discarded', discard_reason = 'dropped it' where id = tests.id('gone');

select throws_ok($$ select tests.dose('d5', 'expired', 1, '2026-10-01T15:00:00Z') $$, 'PLB01', null,
  'no dose from a bottle past its expiration date');
select lives_ok($$ select tests.dose('d6', 'expired', 1, '2026-09-30T20:00:00Z') $$,
  'a dose on the expiration date itself is allowed');
select throws_ok($$ select tests.dose('d7', 'gone', 1) $$, 'PLB02', null, 'no dose from a discarded bottle');
select throws_ok($$ select tests.dose('d8', 'low', 5.5) $$, 'PLB03', null, 'no dose larger than what is left');
select is((select remaining_ml from public.inventory_items where id = tests.id('low')), 3.00::numeric,
  'a refused dose leaves the bottle untouched');
select isnt((select discarded_at from public.inventory_items where id = tests.id('gone')), null,
  'discarding a bottle stamps discarded_at');

-- A bottle of a different product is refused by the (bottle, product) FK.
insert into public.products (id, farm_id, name, drug_class, dose_basis, dose_ml, route, slaughter_withdrawal_days)
values (tests.remember('other_product', gen_random_uuid()), tests.id('farm'), 'Other', 'other', 'per_head', 2, 'SC', 0);
select throws_ok(format($$ insert into public.administrations (id, farm_id, animal_id, product_id, inventory_item_id, dose_ml,
    route, source, processing_event_id) values (gen_random_uuid(), %L, %L, %L, %L, 2, 'SC', 'processing', %L) $$,
  tests.id('farm'), tests.id('calf'), tests.id('other_product'), tests.id('low'), tests.id('calf_event')),
  '23503', null, 'a dose must come from a bottle of the same product');

-- ---------------------------------------------------------------------------------------------
-- Skipped steps
-- ---------------------------------------------------------------------------------------------
insert into public.administrations (id, farm_id, animal_id, product_id, route, source, processing_event_id,
                                    skipped, skip_reason, cost_cents, withdrawal_clear_date)
values (tests.remember('skip', gen_random_uuid()), tests.id('farm'), tests.id('calf'), tests.id('product'), 'SC',
        'processing', tests.id('calf_event'), true, 'Replacement candidate', 500, '2030-01-01');
select is((select cost_cents from public.administrations where id = tests.id('skip')), 0, 'a skipped step costs nothing');
select is((select withdrawal_clear_date from public.administrations where id = tests.id('skip')), null,
  'a skipped step has no withdrawal date');

-- ---------------------------------------------------------------------------------------------
-- Void restores the bottle (§6)
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('owner');
select public.void_record('administrations', tests.id('d3'), 'wrong volume');
select tests.as_postgres();
select is((select remaining_ml from public.inventory_items where id = tests.id('fresh')), 484.50::numeric,
  'voiding a dose puts it back in the bottle');
select is((select status from public.inventory_items where id = tests.id('fresh')), 'open'::public.inventory_status,
  'and re-opens an empty bottle');

select tests.authenticate_as('owner');
select public.void_record('administrations', tests.id('skip'), 'not skipped after all');
select public.void_record('processing_events', tests.id('calf_event'), 'undo last calf');
select tests.as_postgres();
select is((select remaining_ml from public.inventory_items where id = tests.id('fresh')), 500.00::numeric,
  'undoing the calf restores every dose from it (and voiding a skipped step changes nothing)');
select is((select remaining_ml from public.inventory_items where id = tests.id('expired')), 100.00::numeric,
  'including doses from other bottles');

-- ---------------------------------------------------------------------------------------------
-- Pull number (§5.4)
-- ---------------------------------------------------------------------------------------------
create function tests.pull(p_key text, p_dx public.diagnosis, p_claim int default 99) returns int
language sql as $$
  insert into public.treatments (id, farm_id, animal_id, diagnosis, pull_number, pulled_at, metaphylaxis_warning_ack)
  values (tests.remember(p_key, gen_random_uuid()), tests.id('farm'), tests.id('calf'), p_dx, p_claim,
          '2026-11-15T15:00:00Z', true)
  returning pull_number
$$;
select is(tests.pull('p1', 'brd'), 1, 'first BRD pull is pull 1 (client value ignored)');
select is(tests.pull('p2', 'brd'), 2, 'second BRD pull is pull 2');
select is(tests.pull('p3', 'footrot'), 1, 'pull numbers count per diagnosis');
select tests.authenticate_as('owner');
select public.void_record('treatments', tests.id('p2'), 'duplicate entry');
select tests.as_postgres();
select is(tests.pull('p4', 'brd'), 2, 'voided pulls are not counted');

-- ---------------------------------------------------------------------------------------------
-- Metaphylaxis acknowledgement (§5.4) — enforced in the DB, not just the dialog.
-- ---------------------------------------------------------------------------------------------
insert into public.animals (id, farm_id, lot_id, visual_tag) values
  (tests.remember('meta_calf', gen_random_uuid()), tests.id('farm'), tests.id('lot'), '402');
insert into public.processing_events (id, farm_id, session_id, animal_id)
values (tests.remember('meta_event', gen_random_uuid()), tests.id('farm'), tests.id('session'), tests.id('meta_calf'));
insert into public.administrations (id, farm_id, animal_id, product_id, inventory_item_id, dose_ml, route, given_at,
                                    source, processing_event_id)
values (gen_random_uuid(), tests.id('farm'), tests.id('meta_calf'), tests.id('product'), tests.id('fresh'), 5.5, 'SC',
        '2026-10-01T15:00:00Z', 'processing', tests.id('meta_event'));

create function tests.meta_pull(p_at timestamptz, p_ack boolean) returns void language sql as $$
  insert into public.treatments (id, farm_id, animal_id, diagnosis, pull_number, pulled_at, metaphylaxis_warning_ack)
  values (gen_random_uuid(), tests.id('farm'), tests.id('meta_calf'), 'brd', 1, p_at, p_ack)
$$;
select throws_ok($$ select tests.meta_pull('2026-10-07T15:00:00Z', false) $$, 'PLT01', null,
  'a pull on day 6 of a 7-day interval needs the acknowledgement');
select lives_ok($$ select tests.meta_pull('2026-10-07T15:00:00Z', true) $$, 'with the acknowledgement it saves');
select lives_ok($$ select tests.meta_pull('2026-10-08T15:00:00Z', false) $$, 'day 7 is outside the interval');

-- ---------------------------------------------------------------------------------------------
-- Animal status: deaths and sales (§4)
-- ---------------------------------------------------------------------------------------------
select is((select status from public.animals where id = tests.id('animal_dead')), 'dead'::public.animal_status,
  'recording a death marks the animal dead');
select is((select removal_date from public.animals where id = tests.id('animal_dead')), '2026-10-20'::date,
  'with the death date as the removal date');
select is((select status from public.animals where id = tests.id('animal_sold')), 'sold'::public.animal_status,
  'linking an animal to a sale marks it sold');
select is((select removal_date from public.animals where id = tests.id('animal_sold')), '2027-03-01'::date,
  'with the sale date as the removal date');
select throws_ok(format($$ insert into public.deaths (farm_id, animal_id, died_on) values (%L, %L, '2027-03-02') $$,
  tests.id('farm'), tests.id('animal_sold')), '55000', null, 'a death can only be recorded for an active animal');

select tests.authenticate_as('hand');
select throws_ok(format($$ update public.animals set sale_id = %L where id = %L $$, tests.id('sale'), tests.id('calf')),
  '42501', null, 'a hand cannot link an animal to a sale');
select throws_ok(format($$ update public.animals set status = 'dead' where id = %L $$, tests.id('calf')),
  '55000', null, 'an animal is not marked dead without a death record');
select throws_ok(format($$ update public.animals set status = 'active' where id = %L $$, tests.id('animal_dead')),
  '55000', null, 'a dead animal cannot be set back to active');
select throws_ok(format($$ update public.animals set status = 'removed' where id = %L $$, tests.id('calf')),
  '22023', null, 'removing an animal needs a reason');
select lives_ok(format($$ update public.animals set status = 'removed', removal_reason = 'Sent home to owner' where id = %L $$,
  tests.id('calf')), 'a hand can remove an animal with a reason');
select tests.as_postgres();
select isnt((select removal_date from public.animals where id = tests.id('calf')), null, 'removal_date defaults to today');

select tests.authenticate_as('owner');
select lives_ok(format($$ update public.animals set sale_id = null where id = %L $$, tests.id('animal_sold')),
  'an owner can unlink a mistaken sale');
select tests.as_postgres();
select is((select status from public.animals where id = tests.id('animal_sold')), 'active'::public.animal_status,
  'which returns the animal to active');

select * from finish();
rollback;
