-- M1.2: the void pattern (§6) and void_record() role rules (§3).
begin;
\ir _helpers.psql
select plan(27);
select tests.seed_basic();

-- Extra fixtures: an owner-created animal, and a hand's treatment from 25 hours ago.
insert into public.animals (id, farm_id, lot_id, visual_tag, created_by)
values (tests.remember('owners_animal', gen_random_uuid()), tests.id('farm'), tests.id('lot'), '301', tests.id('owner'));
insert into public.treatments (id, farm_id, animal_id, diagnosis, pull_number, created_by, created_at)
values (tests.remember('old_treatment', gen_random_uuid()), tests.id('farm'), tests.id('animal'), 'pinkeye', 1,
        tests.id('hand'), now() - interval '25 hours');
insert into public.treatments (id, farm_id, animal_id, diagnosis, pull_number, created_by)
values (tests.remember('fresh_treatment', gen_random_uuid()), tests.id('farm'), tests.id('animal'), 'footrot', 1,
        tests.id('hand'));

select ok(not has_function_privilege('anon', 'public.void_record(text, uuid, text)', 'execute'),
  'anon cannot call void_record');

-- ---------------------------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('owner');
select throws_ok(format($$ select public.void_record('administrations', %L, 'oops') $$, tests.id('admin')),
  '22023', null, 'a reason under 5 characters is rejected');
select throws_ok(format($$ select public.void_record('administrations', %L, '    too   ') $$, tests.id('admin')),
  '22023', null, 'the reason is trimmed before the length check');
select throws_ok(format($$ select public.void_record('administrations', %L, null) $$, tests.id('admin')),
  '22023', null, 'a null reason is rejected');
select throws_ok(format($$ select public.void_record('lots', %L, 'wrong lot') $$, tests.id('lot')),
  '22023', null, 'tables outside the void pattern are rejected');
select throws_ok($$ select public.void_record('administrations', gen_random_uuid(), 'no such row') $$,
  'P0002', null, 'an unknown id is not found');

-- ---------------------------------------------------------------------------------------------
-- Who may void
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('vet');
select throws_ok(format($$ select public.void_record('administrations', %L, 'vet says no') $$, tests.id('admin')),
  '42501', null, 'a vet cannot void');

select tests.authenticate_as('outsider');
select throws_ok(format($$ select public.void_record('administrations', %L, 'not my farm') $$, tests.id('admin')),
  'P0002', null, 'a member of another farm gets not-found');
select tests.authenticate_as('nobody');
select throws_ok(format($$ select public.void_record('administrations', %L, 'not my farm') $$, tests.id('admin')),
  'P0002', null, 'a non-member gets not-found');

select tests.authenticate_as('hand');
select throws_ok(format($$ select public.void_record('animals', %L, 'not mine') $$, tests.id('owners_animal')),
  '42501', null, 'a hand cannot void a record someone else created');
select throws_ok(format($$ select public.void_record('treatments', %L, 'too late now') $$, tests.id('old_treatment')),
  '42501', null, 'a hand cannot void their own record after 24 hours');
select lives_ok(format($$ select public.void_record('treatments', %L, 'wrong animal') $$, tests.id('fresh_treatment')),
  'a hand can void their own record within 24 hours');

select tests.authenticate_as('owner');
select lives_ok(format($$ select public.void_record('animals', %L, 'entered twice') $$, tests.id('owners_animal')),
  'an owner can void their own record');
select lives_ok(format($$ select public.void_record('treatments', %L, 'owner cleanup') $$, tests.id('old_treatment')),
  'an owner can void anyone''s record at any age');

-- ---------------------------------------------------------------------------------------------
-- Undo last calf: voiding a processing event voids its doses in one go.
-- ---------------------------------------------------------------------------------------------
select tests.authenticate_as('hand');
select lives_ok(format($$ select public.void_record('processing_events', %L, '  undo last calf  ') $$, tests.id('event')),
  'a hand can undo their own calf');
select tests.as_postgres();
select is((select void_reason from public.processing_events where id = tests.id('event')), 'undo last calf',
  'the reason is stored trimmed');
select isnt((select voided_at from public.administrations where id = tests.id('admin')), null,
  'the calf''s administrations are voided with it');
select is((select void_reason from public.administrations where id = tests.id('admin')), 'undo last calf',
  'with the same reason');
select is((select voided_at from public.administrations where id = tests.id('tx_admin')), null,
  'doses from other events are untouched');

-- Idempotent retry
select tests.authenticate_as('hand');
select lives_ok(format($$ select public.void_record('processing_events', %L, 'a retry from the outbox') $$, tests.id('event')),
  'voiding an already-voided record is a no-op');
select tests.as_postgres();
select is((select void_reason from public.processing_events where id = tests.id('event')), 'undo last calf',
  'and keeps the original reason');

-- Voiding a treatment voids its administrations.
select tests.authenticate_as('owner');
select lives_ok(format($$ select public.void_record('treatments', %L, 'wrong diagnosis') $$, tests.id('treatment')),
  'an owner can void a treatment');
select tests.as_postgres();
select isnt((select voided_at from public.administrations where id = tests.id('tx_admin')), null,
  'the treatment''s administrations are voided with it');

-- ---------------------------------------------------------------------------------------------
-- No un-voiding, no edits after voiding, no direct voiding.
-- ---------------------------------------------------------------------------------------------
select throws_ok(format($$ update public.administrations set voided_at = null, void_reason = null where id = %L $$,
  tests.id('admin')), '55000', null, 'a voided record cannot be un-voided (even by the table owner)');

select tests.authenticate_as('owner');
select throws_ok(format($$ update public.treatments set notes = 'edit after void' where id = %L $$, tests.id('treatment')),
  '55000', null, 'a voided treatment cannot be edited');
select throws_ok(format($$ update public.administrations set voided_at = now(), void_reason = 'direct void' where id = %L $$,
  tests.id('tx_admin')), '42501', null, 'administrations cannot be voided by a direct UPDATE');

select tests.as_postgres();
insert into public.processing_events (id, farm_id, session_id, animal_id)
values (tests.remember('event2', gen_random_uuid()), tests.id('farm'), tests.id('session'), tests.id('animal'));
select throws_ok(format($$ update public.processing_events set temp_f = 104.0 where id = %L $$, tests.id('event2')),
  '55000', null, 'processing events cannot be edited, only voided');

select * from finish();
rollback;
