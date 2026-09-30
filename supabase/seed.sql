-- Production seed (SPEC §9). Runs on `supabase db reset` locally, and once by hand against the
-- farm project at gate G1 — WITHOUT seed.dev.sql. Safe to run more than once.
--
-- Clinical values are exactly as the owner supplied them in §9. Every product starts with
-- needs_label_verification = true and both protocols start unapproved; the owner verifies labels
-- and records the vet's sign-off in the app (gate G3). Nothing here is invented: fields §9
-- doesn't give (rx_only, active ingredient for branded/vaccine products) are left null.
--
-- Flunixin is listed as "IV/IM neck"; the product's default route is the first listed (IV), and
-- the route can be changed on each administration.

insert into public.farms (id, name) values
  ('00000000-0000-4000-8000-000000000001', 'Pierce Land & Cattle')
on conflict do nothing;

insert into public.products (
  id, farm_id, name, active_ingredient, drug_class, is_antimicrobial, dose_basis, dose_ml, unit, route,
  default_site, max_ml_per_site, slaughter_withdrawal_days, post_metaphylaxis_interval_days,
  needs_label_verification, human_safety_note
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Tulathromycin',
   'tulathromycin', 'macrolide', true, 'per_100lb', 1.1, 'mL', 'SC', 'neck', 10, 18, 7, true, null),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'Intranasal MLV IBR/PI3/BRSV',
   null, 'vaccine_intranasal', false, 'per_head', 2, 'mL', 'intranasal', null, null, 21, null, true, null),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'MLV 5-way injectable',
   null, 'vaccine_mlv_resp', false, 'per_head', 2, 'mL', 'SC', 'neck', null, 21, null, true, null),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', 'Clostridial 7-way',
   null, 'vaccine_clostridial', false, 'per_head', 2, 'mL', 'SC', 'neck', null, 21, null, true, null),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'Doramectin injectable',
   'doramectin', 'anthelmintic_ml', false, 'per_100lb', 0.91, 'mL', 'SC', 'neck', 10, 35, null, true, null),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'Fenbendazole 10%',
   'fenbendazole', 'anthelmintic_bz', false, 'per_100lb', 2.3, 'mL', 'oral', null, null, 8, null, true, null),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', 'Dinoprost',
   'dinoprost', 'prostaglandin', false, 'per_head', 5, 'mL', 'IM', 'neck', null, 0, null, true,
   'Handle with gloves. Women of childbearing age and people with asthma use caution.'),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'Implant (Ralgro)',
   null, 'implant', false, 'per_head', 1, 'each', 'implant', 'ear', null, 0, null, true, null),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', 'Florfenicol',
   'florfenicol', 'phenicol', true, 'per_100lb', 6, 'mL', 'SC', 'neck', 10, 38, null, true, null),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Flunixin',
   'flunixin', 'nsaid', false, 'per_100lb', 2, 'mL', 'IV', 'neck', 10, 4, null, true, null),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Enrofloxacin',
   'enrofloxacin', 'fluoroquinolone', true, 'per_100lb', 3.4, 'mL', 'SC', 'neck', 20, 28, null, true, null)
on conflict do nothing;

insert into public.protocols (id, farm_id, name, kind, nsaid_temp_threshold_f, approved_by, approved_on) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   'Fall Receiving — High Risk', 'processing', 104.0, null, null),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
   'BRD Treatment', 'treatment', 104.0, null, null)
on conflict do nothing;

insert into public.protocol_steps (
  id, farm_id, protocol_id, sequence, product_id, session_kind, pull_number, applies_to, conditional
) values
  -- Fall Receiving — High Risk: arrival
  ('21000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   1, '10000000-0000-4000-8000-000000000002', 'arrival', null, 'all', 'none'),
  ('21000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   2, '10000000-0000-4000-8000-000000000004', 'arrival', null, 'all', 'none'),
  ('21000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   3, '10000000-0000-4000-8000-000000000001', 'arrival', null, 'all', 'none'),
  ('21000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   4, '10000000-0000-4000-8000-000000000005', 'arrival', null, 'all', 'none'),
  ('21000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   5, '10000000-0000-4000-8000-000000000006', 'arrival', null, 'all', 'none'),
  ('21000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   6, '10000000-0000-4000-8000-000000000007', 'arrival', null, 'heifers', 'none'),
  ('21000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   7, '10000000-0000-4000-8000-000000000008', 'arrival', null, 'feeders_only', 'none'),
  -- Fall Receiving — High Risk: booster
  ('21000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   1, '10000000-0000-4000-8000-000000000003', 'booster', null, 'all', 'none'),
  ('21000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
   2, '10000000-0000-4000-8000-000000000004', 'booster', null, 'all', 'none'),
  -- BRD Treatment: pull 1, pull 2 (pull 3+ is beyond protocol)
  ('22000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
   1, '10000000-0000-4000-8000-000000000009', null, 1, 'all', 'none'),
  ('22000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
   2, '10000000-0000-4000-8000-000000000010', null, 1, 'all', 'temp_gte_threshold'),
  ('22000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
   1, '10000000-0000-4000-8000-000000000011', null, 2, 'all', 'none')
on conflict do nothing;
