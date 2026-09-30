-- M1.4: seed.sql matches SPEC §9 exactly; seed.dev.sql provides users per role and the golden lot.
begin;
\ir _helpers.psql
select plan(27);

-- ---------------------------------------------------------------------------------------------
-- seed.sql — products (§9). Every value is compared; nothing extra is filled in.
-- ---------------------------------------------------------------------------------------------
create temp table expected_products (
  name text, drug_class public.drug_class, dose_basis public.dose_basis, dose_ml numeric, unit public.product_unit,
  route public.route, default_site text, max_ml_per_site numeric, slaughter_withdrawal_days int,
  post_metaphylaxis_interval_days int, is_antimicrobial boolean
) on commit drop;
insert into expected_products values
  ('Tulathromycin',               'macrolide',           'per_100lb', 1.1,  'mL',   'SC',         'neck', 10,   18, 7,    true),
  ('Intranasal MLV IBR/PI3/BRSV', 'vaccine_intranasal',  'per_head',  2,    'mL',   'intranasal', null,   null, 21, null, false),
  ('MLV 5-way injectable',        'vaccine_mlv_resp',    'per_head',  2,    'mL',   'SC',         'neck', null, 21, null, false),
  ('Clostridial 7-way',           'vaccine_clostridial', 'per_head',  2,    'mL',   'SC',         'neck', null, 21, null, false),
  ('Doramectin injectable',       'anthelmintic_ml',     'per_100lb', 0.91, 'mL',   'SC',         'neck', 10,   35, null, false),
  ('Fenbendazole 10%',            'anthelmintic_bz',     'per_100lb', 2.3,  'mL',   'oral',       null,   null, 8,  null, false),
  ('Dinoprost',                   'prostaglandin',       'per_head',  5,    'mL',   'IM',         'neck', null, 0,  null, false),
  ('Implant (Ralgro)',            'implant',             'per_head',  1,    'each', 'implant',    'ear',  null, 0,  null, false),
  ('Florfenicol',                 'phenicol',            'per_100lb', 6,    'mL',   'SC',         'neck', 10,   38, null, true),
  ('Flunixin',                    'nsaid',               'per_100lb', 2,    'mL',   'IV',         'neck', 10,   4,  null, false),
  ('Enrofloxacin',                'fluoroquinolone',     'per_100lb', 3.4,  'mL',   'SC',         'neck', 20,   28, null, true);

create temp view seeded_products as
  select p.* from public.products p join public.farms f on f.id = p.farm_id where f.name = 'Pierce Land & Cattle';

select is((select count(*)::int from seeded_products), 11, 'the farm has the 11 seeded products');
select set_eq(
  $$ select name, drug_class, dose_basis, dose_ml, unit, route, default_site, max_ml_per_site, slaughter_withdrawal_days,
            post_metaphylaxis_interval_days, is_antimicrobial from seeded_products $$,
  $$ select * from expected_products $$,
  'every seeded product matches §9'
);
select is((select count(*)::int from seeded_products where not needs_label_verification), 0,
  'every seeded product needs label verification');
select is((select count(*)::int from seeded_products where rx_only is not null), 0,
  'rx_only is left for the owner (not in §9)');
select is((select human_safety_note from seeded_products where name = 'Dinoprost'),
  'Handle with gloves. Women of childbearing age and people with asthma use caution.',
  'Dinoprost carries the human safety note');
select is((select count(*)::int from seeded_products where human_safety_note is not null), 1,
  'no other product has an invented safety note');

-- ---------------------------------------------------------------------------------------------
-- seed.sql — protocols (§9)
-- ---------------------------------------------------------------------------------------------
create temp view seeded_steps as
  select pr.name as protocol, pr.kind, s.session_kind, s.pull_number, s.sequence, p.name as product,
         s.applies_to, s.conditional
    from public.protocol_steps s
    join public.protocols pr on pr.id = s.protocol_id
    join public.products p on p.id = s.product_id
    join public.farms f on f.id = pr.farm_id
   where f.name = 'Pierce Land & Cattle';

select is((select count(*)::int from public.protocols pr join public.farms f on f.id = pr.farm_id
            where f.name = 'Pierce Land & Cattle' and pr.approved_by is null and pr.approved_on is null), 2,
  'both seeded protocols await vet approval');
select results_eq(
  $$ select product, applies_to::text from seeded_steps
      where protocol = 'Fall Receiving — High Risk' and session_kind = 'arrival' order by sequence $$,
  $$ values ('Intranasal MLV IBR/PI3/BRSV', 'all'), ('Clostridial 7-way', 'all'), ('Tulathromycin', 'all'),
            ('Doramectin injectable', 'all'), ('Fenbendazole 10%', 'all'), ('Dinoprost', 'heifers'),
            ('Implant (Ralgro)', 'feeders_only') $$,
  'arrival steps, in order, with dinoprost for heifers and the implant for feeders only'
);
select results_eq(
  $$ select product from seeded_steps
      where protocol = 'Fall Receiving — High Risk' and session_kind = 'booster' order by sequence $$,
  $$ values ('MLV 5-way injectable'), ('Clostridial 7-way') $$,
  'booster steps'
);
select is((select kind::text from public.protocols where name = 'Fall Receiving — High Risk'), 'processing',
  'Fall Receiving is a processing protocol');
select results_eq(
  $$ select pull_number, product, conditional::text from seeded_steps
      where protocol = 'BRD Treatment' order by pull_number, sequence $$,
  $$ values (1, 'Florfenicol', 'none'), (1, 'Flunixin', 'temp_gte_threshold'), (2, 'Enrofloxacin', 'none') $$,
  'BRD pull 1: florfenicol + flunixin (conditional); pull 2: enrofloxacin; nothing for pull 3+'
);
select is((select nsaid_temp_threshold_f from public.protocols where name = 'BRD Treatment'), 104.0::numeric,
  'NSAID threshold is 104.0 °F');
select is((select kind::text from public.protocols where name = 'BRD Treatment'), 'treatment',
  'BRD Treatment is a treatment protocol');


-- ---------------------------------------------------------------------------------------------
-- seed.dev.sql — users per role and the golden-case lot (§5.7)
-- ---------------------------------------------------------------------------------------------
select results_eq(
  $$ select u.email::text, m.role::text from public.farm_members m join auth.users u on u.id = m.user_id
       join public.farms f on f.id = m.farm_id where f.name = 'Pierce Land & Cattle' order by m.role $$,
  $$ values ('owner@pierce.test', 'owner'), ('hand@pierce.test', 'hand'), ('vet@pierce.test', 'vet') $$,
  'dev users for each role'
);
select is((select count(*)::int from public.farm_members m join auth.users u on u.id = m.user_id
            join public.farms f on f.id = m.farm_id
            where u.email = 'outsider@pierce.test' and f.name = 'Pierce Land & Cattle'), 0,
  'the outsider is not a member of the farm');
select is((select count(*)::int from auth.identities i join auth.users u on u.id = i.user_id
            where u.email like '%@pierce.test'), 4, 'each dev user has an email identity');

create temp view golden as select * from public.lots where name = 'Golden Case — Fall 2026 Heifers';
select is((select head_purchased from golden), 50, 'golden lot: 50 head');
select is((select pay_weight_total_lb from golden), 22500.0::numeric, 'golden lot: 22,500 lb pay weight');
select is((select price_cents_per_cwt from golden), 38000, 'golden lot: $380.00/cwt');
select is((select freight_cents + commission_cents + other_purchase_cents from golden), 60000,
  'golden lot: $600 freight, no commission');
select is((select purchase_date from golden), '2026-10-01'::date, 'golden lot: purchased 2026-10-01');
select is((select count(*)::int from public.animals where lot_id = (select id from golden) and status = 'sold'), 49,
  'golden lot: 49 sold');
select is((select count(*)::int from public.deaths d join public.animals a on a.id = d.animal_id
            where a.lot_id = (select id from golden)), 1, 'golden lot: one death');
select is((select sum(amount_cents)::int from public.lot_costs where lot_id = (select id from golden)), 1000000,
  'golden lot: $10,000.00 of costs');
select results_eq(
  $$ select head, sale_date, sale_weight_total_lb, price_cents_per_cwt, commission_cents,
            freight_cents + checkoff_cents + other_cents
       from public.sales where lot_id = (select id from golden) $$,
  $$ values (49, '2027-03-01'::date, 31850.0::numeric, 33000, 100000, 0) $$,
  'golden lot: 49 head sold 2027-03-01, 31,850 lb at $330.00/cwt, $1,000 commission'
);
select is((select count(*)::int from public.animals a join public.lots l on l.id = a.lot_id
            where l.name = 'Demo Heifers' and a.status = 'active'), 50, 'an active demo lot of 50 for chute work');
select cmp_ok((select count(distinct product_id)::int from public.inventory_items i join public.farms f on f.id = i.farm_id
                where f.name = 'Pierce Land & Cattle' and i.status = 'in_stock'), '=', 11,
  'every product has a demo bottle in stock');

select * from finish();
rollback;
