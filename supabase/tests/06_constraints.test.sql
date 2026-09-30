-- M1.5: the unique active-tag constraint (§4) and table-level data checks.
begin;
\ir _helpers.psql
select plan(19);
select tests.seed_basic();

-- seed_basic: tag 101 active, 102 dead, 103 sold, all in 'lot'.
create function tests.add_animal(p_tag text, p_farm text default 'farm') returns void language sql as $$
  insert into public.lots (id, farm_id, name, sex, risk_level)
  select tests.remember('lot_' || p_farm, gen_random_uuid()), tests.id(p_farm), 'Lot for ' || p_farm, 'mixed', 'low'
   where not exists (select 1 from tests.ids where key = 'lot_' || p_farm);
  insert into public.animals (farm_id, lot_id, visual_tag) values (tests.id(p_farm), tests.id('lot_' || p_farm), p_tag);
$$;

-- ---------------------------------------------------------------------------------------------
-- Unique active tag
-- ---------------------------------------------------------------------------------------------
select throws_ok($$ select tests.add_animal('101') $$, '23505', null, 'a duplicate active tag is rejected');
select lives_ok($$ select tests.add_animal('A12') $$, 'tag A12 added');
select throws_ok($$ select tests.add_animal('a12') $$, '23505', null, 'tags are unique regardless of case');
select lives_ok($$ select tests.add_animal('101', 'other_farm') $$, 'another farm can use the same tag');
select lives_ok($$ select tests.add_animal('102') $$, 'a dead animal''s tag can be reused');
select lives_ok($$ select tests.add_animal('103') $$, 'a sold animal''s tag can be reused');

update public.animals set voided_at = now(), void_reason = 'entered in error'
 where farm_id = tests.id('farm') and visual_tag = 'A12';
select lives_ok($$ select tests.add_animal('A12') $$, 'a voided animal''s tag can be reused');

update public.animals set status = 'removed', removal_reason = 'Returned to seller'
 where farm_id = tests.id('farm') and visual_tag = '101' and status = 'active';
select lives_ok($$ select tests.add_animal('101') $$, 'a removed animal''s tag can be reused');

select throws_ok(format($$ update public.animals set sale_id = null where id = %L $$, tests.id('animal_sold')),
  '23505', null, 'an animal can''t return to active while another active animal has its tag');

select throws_ok($$ select tests.add_animal(' 105') $$, '23514', null, 'tags are stored trimmed');
select throws_ok($$ select tests.add_animal('') $$, '23514', null, 'a tag can''t be blank');

-- ---------------------------------------------------------------------------------------------
-- Data checks
-- ---------------------------------------------------------------------------------------------
select throws_ok(format($$ insert into public.animals (farm_id, lot_id, visual_tag, voided_at, void_reason)
    values (%L, %L, '901', now(), 'bad') $$, tests.id('farm'), tests.id('lot')),
  '23514', null, 'a void reason needs at least 5 characters');
select throws_ok(format($$ insert into public.administrations (id, farm_id, animal_id, product_id, route, source,
    processing_event_id, skipped) values (gen_random_uuid(), %L, %L, %L, 'SC', 'processing', %L, true) $$,
  tests.id('farm'), tests.id('animal'), tests.id('product'), tests.id('event')),
  '23514', null, 'a skipped step needs a reason');
select throws_ok(format($$ insert into public.animals (farm_id, lot_id, visual_tag, voided_at)
    values (%L, %L, '902', now()) $$, tests.id('farm'), tests.id('lot')),
  '23514', null, 'a voided row needs a reason (not null)');
select throws_ok(format($$ insert into public.inventory_items (farm_id, product_id, lot_number, expiration_date, size_ml,
    cost_cents, status) values (%L, %L, 'X9', '2099-01-01', 10, 100, 'discarded') $$, tests.id('farm'), tests.id('product')),
  '23514', null, 'a discarded bottle needs a reason');
select throws_ok(format($$ insert into public.treatments (id, farm_id, animal_id, diagnosis, pull_number, signs,
    metaphylaxis_warning_ack) values (gen_random_uuid(), %L, %L, 'brd', 1, '{D,X}', true) $$,
  tests.id('farm'), tests.id('animal')),
  '23514', null, 'signs are limited to D, A, R, other');
select throws_ok(format($$ insert into public.processing_events (id, farm_id, session_id, animal_id, temp_f)
    values (gen_random_uuid(), %L, %L, %L, 1045) $$, tests.id('farm'), tests.id('session'), tests.id('animal_dead')),
  '22003', null, 'a temperature typo (1045 °F) doesn''t fit numeric(4,1)');
select throws_ok(format($$ insert into public.processing_events (id, farm_id, session_id, animal_id, temp_f)
    values (gen_random_uuid(), %L, %L, %L, 45.0) $$, tests.id('farm'), tests.id('session'), tests.id('animal_dead')),
  '23514', null, 'a temperature outside 90–115 °F is rejected');
select throws_ok(format($$ insert into public.processing_events (id, farm_id, session_id, animal_id, dose_weight_lb,
    dose_weight_source) values (gen_random_uuid(), %L, %L, %L, 452, 'event_tape') $$,
  tests.id('farm'), tests.id('session'), tests.id('animal_dead')),
  '23514', null, 'dose_weight_lb is a 50 lb bracket');

select * from finish();
rollback;
