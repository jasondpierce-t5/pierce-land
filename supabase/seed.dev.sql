-- DEV ONLY (local `supabase db reset`). Never run against the farm project.
-- Adds sign-in users for each role, a second farm with an outsider, the §5.7 golden-case lot as a
-- finished turn, an active demo lot for chute work, and demo bottles. Bottle costs, lot numbers,
-- and expiry dates are made-up demo data.
--
-- Dev sign-in (local only): owner@ / hand@ / vet@ / outsider@pierce.test, password
-- `pierce-dev-password` — or request a magic link and open it in Mailpit (http://127.0.0.1:54324).

-- ---------------------------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('pierce-dev-password', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.display_name),
       now(), now(), '', '', '', ''
  from (values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'owner@pierce.test', 'Jason (dev owner)'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'hand@pierce.test', 'Ranch Hand (dev)'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'vet@pierce.test', 'Dr. Vet (dev)'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 'outsider@pierce.test', 'Outsider (dev)')
  ) as u(id, email, display_name)
on conflict do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users u
 where u.email like '%@pierce.test'
on conflict do nothing;

insert into public.farms (id, name) values
  ('00000000-0000-4000-8000-000000000002', 'Neighbor Farm (dev)')
on conflict do nothing;

insert into public.farm_members (farm_id, user_id, role, display_name) values
  ('00000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'owner', 'Jason (dev owner)'),
  ('00000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', 'hand', 'Ranch Hand (dev)'),
  ('00000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', 'vet', 'Dr. Vet (dev)'),
  ('00000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004', 'owner', 'Outsider (dev)')
on conflict do nothing;

-- ---------------------------------------------------------------------------------------------
-- Golden case (§5.7) as a finished turn: tags 101–150, one death, 49 sold, $10,000 of costs.
-- ---------------------------------------------------------------------------------------------
insert into public.lots (id, farm_id, name, status, sex, risk_level, purchase_date, source_type, source_name,
                         head_purchased, pay_weight_total_lb, price_cents_per_cwt, freight_cents,
                         commission_cents, other_purchase_cents, target_sale_date)
values ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
        'Golden Case — Fall 2026 Heifers', 'closed', 'heifer', 'high', '2026-10-01', 'sale_barn', 'Demo Sale Barn',
        50, 22500, 38000, 60000, 0, 0, '2027-03-01')
on conflict do nothing;

insert into public.animals (farm_id, lot_id, visual_tag, sex, arrival_date)
select '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', tag::text, 'heifer', '2026-10-01'
  from generate_series(101, 150) tag
 where not exists (select 1 from public.animals where lot_id = '30000000-0000-4000-8000-000000000001');

insert into public.deaths (farm_id, animal_id, died_on, suspected_cause, necropsy_done)
select a.farm_id, a.id, '2026-11-05', 'BRD', false
  from public.animals a
 where a.lot_id = '30000000-0000-4000-8000-000000000001' and a.visual_tag = '150' and a.status = 'active';

insert into public.lot_costs (id, farm_id, lot_id, cost_date, category, amount_cents, description) values
  ('31000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   '2026-10-31', 'feed', 600000, 'Demo: supplement'),
  ('31000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   '2026-12-15', 'hay', 250000, 'Demo: hay'),
  ('31000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   '2026-11-15', 'mineral', 80000, 'Demo: mineral'),
  ('31000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   '2026-10-20', 'vet_call', 70000, 'Demo: vet call')
on conflict do nothing;

insert into public.sales (id, farm_id, lot_id, sale_date, head, sale_weight_total_lb, price_cents_per_cwt,
                          commission_cents, freight_cents, checkoff_cents, other_cents, buyer)
values ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001', '2027-03-01', 49, 31850, 33000, 100000, 0, 0, 0, 'Demo Buyer')
on conflict do nothing;

update public.animals set sale_id = '50000000-0000-4000-8000-000000000001'
 where lot_id = '30000000-0000-4000-8000-000000000001' and status = 'active';

-- ---------------------------------------------------------------------------------------------
-- Demo Heifers: an active lot of 50 (tags 201–250) waiting for arrival processing.
-- Tags 246–250 are replacement candidates, so the implant step auto-skips for them.
-- ---------------------------------------------------------------------------------------------
insert into public.lots (id, farm_id, name, status, sex, risk_level, purchase_date, source_type, source_name,
                         head_purchased, pay_weight_total_lb, price_cents_per_cwt, freight_cents)
values ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
        'Demo Heifers', 'receiving', 'heifer', 'high', '2026-09-29', 'sale_barn', 'Demo Sale Barn',
        50, 23400, 37500, 55000)
on conflict do nothing;

insert into public.animals (farm_id, lot_id, visual_tag, sex, arrival_date, is_replacement_candidate)
select '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', tag::text, 'heifer',
       '2026-09-29', tag >= 246
  from generate_series(201, 250) tag
 where not exists (select 1 from public.animals where lot_id = '30000000-0000-4000-8000-000000000002');

-- ---------------------------------------------------------------------------------------------
-- Demo bottles: one in stock per product, a second tulathromycin for bottle changes, and an
-- expired clostridial bottle to exercise the expiry block.
-- ---------------------------------------------------------------------------------------------
insert into public.inventory_items (id, farm_id, product_id, lot_number, expiration_date, size_ml, cost_cents)
select ('40000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, '00000000-0000-4000-8000-000000000001',
       ('10000000-0000-4000-8000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'DEMO-' || n, '2027-12-31', size_ml, cost_cents
  from (values (1, 500, 120000), (2, 100, 45000), (3, 100, 30000), (4, 250, 20000), (5, 500, 35000),
               (6, 1000, 9000), (7, 100, 6000), (8, 100, 15000), (9, 500, 90000), (10, 250, 12000),
               (11, 250, 40000)) as b(n, size_ml, cost_cents)
on conflict do nothing;

insert into public.inventory_items (id, farm_id, product_id, lot_number, expiration_date, size_ml, cost_cents) values
  ('40000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'DEMO-1B', '2028-06-30', 250, 62000),
  ('40000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000004', 'EXPIRED-DEMO', '2026-09-01', 250, 20000)
on conflict do nothing;
