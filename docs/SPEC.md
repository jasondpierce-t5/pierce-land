# SPEC — Pierce Land & Cattle Herd App

Version 1.0 · 2026-09-28

## 1. Context

- **Operation:** stocker/backgrounding. Buys ~50 head per turn (current fall 2026 turn: freshly
  weaned 400–500 lb heifers), receives, grows on grass, sells.
- **Hardware:** one tablet at the chute with Wi-Fi. No scales. No EID readers (yet).
- **Users:** Owner (Jason), ranch hands, and optionally a vet with read-only access.
- **The job of the app:** make chute-side and sick-pen records fast and complete, keep drugs,
  withdrawal times, and inventory straight, and produce a closeout for each turn.

### Non-goals for v1

Breeding, calving, pedigrees, EPDs, full offline mode, EID hardware, feed-truck/ration
management, accounting integration.

## 2. Conventions

- **Units.** Money is stored as integer cents (`*_cents`). Weight is `numeric(7,1)` lb.
  Volume is `numeric(7,2)` mL. Temperature is `numeric(4,1)` °F. Dates are `date` in
  America/Chicago; timestamps are `timestamptz`.
- **IDs.** All primary keys are `uuid`. For any record created from the chute or sick pen, the
  **client generates the UUID** so retries are idempotent (§7).
- **Audit columns** on every table: `created_at`, `created_by` (auth uid), `updated_at`.
- **Tenancy.** Every table has `farm_id`. There is one farm today, but everything is scoped by
  farm membership through RLS.

## 3. Roles and RLS

`farm_members(farm_id, user_id, role)`, where role is `owner | hand | vet`.

| Capability | owner | hand | vet |
|---|---|---|---|
| Read all farm data | ✓ | ✓ | ✓ |
| Lots, animals, processing, treatments, deaths, inventory use | ✓ | ✓ | – |
| Products, protocols, costs, sales, closeout, members | ✓ | – | – |
| Void a record | ✓ | own records, within 24h | – |

- A non-member can read nothing.
- **Nobody** can `DELETE` from `administrations`, `treatments`, `processing_events`, or
  `animals`. Revoke delete from the `authenticated` role on those tables.
- Voiding goes through an RPC (`void_record(table, id, reason)`) that enforces the role rules
  above.

## 4. Data model

Build this as Supabase migrations. Column lists are the minimum; add indexes on foreign keys and
on `(farm_id, status)`.

**farms** — `id, name`

**farm_members** — `farm_id, user_id, role, display_name`

**lots** (a "turn")
- `id, farm_id, name` (e.g., "Fall 2026 Heifers")
- `status`: `planned | receiving | active | closed`
- `sex`: `heifer | steer | mixed`
- `risk_level`: `high | moderate | low`
- `purchase_date, source_type` (`sale_barn | ranch_direct | order_buyer | other`)`, source_name`
- `head_purchased int, pay_weight_total_lb`
- `price_cents_per_cwt, freight_cents, commission_cents, other_purchase_cents`
- `target_sale_date` (nullable), `notes`

**animals**
- `id, farm_id, lot_id, visual_tag text, eid text null`
- `sex, description` (color/markings)
- `status`: `active | sold | dead | removed`
- `arrival_date, removal_date null, removal_reason null, sale_id null`
- `is_replacement_candidate bool default false` (blocks implant steps)
- `voided_at, void_reason`
- Constraint: unique `(farm_id, visual_tag)` where `status = 'active'` and `voided_at is null`.

**products** (drug and supply catalog)
- `id, farm_id, name, active_ingredient`
- `drug_class`: `macrolide | phenicol | fluoroquinolone | cephalosporin | tetracycline |
  vaccine_mlv_resp | vaccine_intranasal | vaccine_clostridial | anthelmintic_ml |
  anthelmintic_bz | prostaglandin | nsaid | implant | other`
- `is_antimicrobial bool, rx_only bool`
- `dose_basis`: `per_100lb | per_head`; `dose_ml numeric`
- `unit`: `mL | each`
- `route`: `SC | IM | IV | oral | intranasal | pour_on | implant | topical`
- `default_site text, max_ml_per_site numeric null`
- `slaughter_withdrawal_days int not null`
- `post_metaphylaxis_interval_days int null` (set for products used as metaphylaxis)
- `needs_label_verification bool default true`
- `human_safety_note text null`
- `active bool`

**inventory_items** (one physical bottle or box)
- `id, farm_id, product_id, lot_number, serial_number null, expiration_date`
- `size_ml` (or count, for `each`), `remaining_ml, cost_cents`
- `opened_at null`, `status`: `in_stock | open | empty | expired | discarded`

**protocols**
- `id, farm_id, name`
- `kind`: `processing | treatment`
- `version int, active bool`
- `approved_by text null, approved_on date null` (the vet's sign-off, owner-entered)
- `nsaid_temp_threshold_f numeric default 104.0` (treatment protocols)
- `notes`

**protocol_steps**
- `id, protocol_id, sequence int, product_id`
- `pull_number int null` (treatment protocols: 1, 2, 3…)
- `applies_to`: `all | heifers | feeders_only` (`feeders_only` = skip if
  `is_replacement_candidate`)
- `conditional`: `none | temp_gte_threshold` (e.g., NSAID)
- `required bool, notes`

**processing_sessions**
- `id, farm_id, lot_id, protocol_id, session_date`
- `kind`: `arrival | booster | other`
- `crew text, status`: `open | closed`, `notes`

**session_bottles** — `session_id, product_id, inventory_item_id` (which bottle is in use for
each product this session; can change mid-session)

**processing_events** (one calf through the chute in one session)
- `id` (client UUID), `farm_id, session_id, animal_id`
- `temp_f null, tape_weight_lb null`
- `dose_weight_lb` (the bracket weight actually used for dosing), `dose_weight_source`
- `recorded_by, recorded_at, voided_at, void_reason`

**administrations** (every dose given, from any source)
- `id` (client UUID), `farm_id, animal_id, product_id, inventory_item_id`
- `dose_ml, sites int, route, site`
- `given_at, given_by`
- `source`: `processing | treatment`
- `processing_event_id null, treatment_id null`
- `skipped bool default false, skip_reason null`
- `cost_cents` (snapshotted at insert: `dose_ml × bottle cost per mL`, rounded)
- `withdrawal_clear_date` (snapshotted: `given_at::date + product.slaughter_withdrawal_days`)
- `voided_at, void_reason`
- Trigger: on insert of a non-skipped row, decrement `inventory_items.remaining_ml`; on void,
  add it back.

**treatments** (a pull)
- `id` (client UUID), `farm_id, animal_id, pulled_at`
- `signs text[]` (subset of `D, A, R`, plus `other`)
- `temp_f, est_weight_lb null`
- `diagnosis`: `brd | footrot | pinkeye | other`
- `pull_number int` (computed per §5.4 at insert)
- `protocol_id`
- `metaphylaxis_warning_ack bool default false`
- `recheck_date null`
- `outcome`: `pending | recovered | chronic | died | removed`
- `given_by, notes, voided_at, void_reason`

**deaths** — `id, farm_id, animal_id, died_on, suspected_cause, necropsy_done bool,
necropsy_findings text`. Inserting one sets `animal.status = 'dead'`.

**lot_costs** — `id, farm_id, lot_id, cost_date`, `category` (`feed | hay | mineral | vet_call
| labor | pasture_rent | trucking | interest | supplies | other`), `amount_cents, description`

**sales**
- `id, farm_id, lot_id, sale_date, head, sale_weight_total_lb`
- `price_cents_per_cwt, commission_cents, freight_cents, checkoff_cents, other_cents, buyer`
- Linking animals to a sale sets `status = 'sold'` and `sale_id`.

## 5. Domain rules

Implement these as **pure TypeScript functions in `src/lib/domain/`** with no database or UI
imports. Unit-test each one exhaustively. The UI and server call them; the DB triggers must
agree with them, and a test proves it.

### 5.1 Dosing weight (no scales)

1. **Weight source**, in priority order:
   1. `tape_weight_lb` entered at this event
   2. the animal's most recent tape weight within the last 30 days
   3. the lot's average pay weight (`pay_weight_total_lb / head_purchased`)
2. **Bracket** = round **up** to the next 50 lb: `ceil(w / 50) * 50`.
   Example: 452 → 500, 450 → 450.
3. Store both `dose_weight_lb` and `dose_weight_source`.

### 5.2 Dose volume

- `per_head`: `dose_ml`
- `per_100lb`: `dose_ml × bracket / 100`, rounded **up** to the nearest 0.5 mL
- `sites = ceil(volume / max_ml_per_site)` when `max_ml_per_site` is set, otherwise 1
- Show the split on screen, e.g., "12.0 mL — 2 sites".

### 5.3 Fever flags

Thresholds live in settings with these defaults:

- **Processing:** `temp_f ≥ 104.0` shows an amber "Fever" badge. `temp_f ≥ 105.0` shows a red
  "Sick on arrival" badge and prompts: "Record as day-0 treatment?" Yes opens the treatment
  flow prefilled.
- **Treatment:** the NSAID step is included when `temp_f ≥ protocol.nsaid_temp_threshold_f`.

### 5.4 Pull number and suggested treatment

- `pull_number` = the count of the animal's prior non-voided treatments with the **same
  diagnosis**, plus 1.
- Suggested products = the active treatment protocol's steps where `step.pull_number` equals
  `min(pull_number, max pull_number defined)`. If `pull_number` exceeds the highest defined
  step, show **"Beyond protocol — call vet"** and suggest nothing.
- **Metaphylaxis interval.** If the animal received a product with
  `post_metaphylaxis_interval_days = X` on date D, and the pull happens before D + X, show a
  blocking dialog: "Within post-metaphylaxis interval (day N of X). Per protocol, this may not
  be a treatment failure." The user must tick an acknowledgement (stored as
  `metaphylaxis_warning_ack`) to continue.
- **Same-class warning.** If a suggested antimicrobial has the same `drug_class` as any
  antimicrobial the animal received in the last 14 days, show a warning (not blocking).

### 5.5 Withdrawal

- `administration.withdrawal_clear_date = given_at::date + slaughter_withdrawal_days`
- `animal_clear_date` = the max over its non-voided, non-skipped administrations (null if none)
- `lot_clear_date` = the max over active animals
- Any animal whose clear date is later than a proposed sale date is flagged on the sale screen.
  The sale can still be saved, but the flag is shown in the confirmation.

### 5.6 Inventory

- `cost_per_ml = cost_cents / size_ml`; administration `cost_cents = round(dose_ml × cost_per_ml)`
- Picking a bottle whose `expiration_date` is before today is blocked.
- If `remaining_ml` is less than the dose, prompt to switch bottles. You can't save a dose
  against an empty bottle.
- The first dose from a bottle sets `opened_at` and `status = 'open'`.
- Hitting `remaining_ml = 0` sets `status = 'empty'`.

### 5.7 Closeout

For a lot with sales:

```
head_in           = head_purchased
head_sold         = Σ sales.head
head_dead         = count(deaths)
purchase_cost     = pay_weight_total_lb / 100 × price_cents_per_cwt
                    + freight_cents + commission_cents + other_purchase_cents
avg_in_weight     = pay_weight_total_lb / head_in
sold_in_weight    = avg_in_weight × head_sold
sale_weight_total = Σ sales.sale_weight_total_lb
lb_gained         = sale_weight_total − sold_in_weight
days_on_feed      = head-weighted mean of (sale_date − purchase_date) across sales
adg               = lb_gained / head_sold / days_on_feed
drug_cost         = Σ non-voided administrations.cost_cents for the lot's animals
other_cost        = Σ lot_costs.amount_cents
non_purchase_cost = drug_cost + other_cost
total_cost        = purchase_cost + non_purchase_cost
cog               = non_purchase_cost / lb_gained                       ($/lb)
dead_purchase     = purchase_cost / head_in × head_dead
cog_incl_death    = (non_purchase_cost + dead_purchase) / lb_gained     ($/lb)
gross_sales       = Σ sale_weight_total_lb / 100 × price_cents_per_cwt
sale_expenses     = Σ commission + freight + checkoff + other
net_proceeds      = gross_sales − sale_expenses
breakeven_cwt     = (total_cost + sale_expenses) / sale_weight_total × 100
net_profit        = net_proceeds − total_cost
profit_per_head_in = net_profit / head_in
death_loss_pct    = head_dead / head_in
morbidity_pct     = animals with ≥1 BRD treatment / head_in
retreat_pct       = animals with ≥2 BRD treatments / animals with ≥1
```

Guard every division. If the denominator is 0, return null and display "—".

**Golden test case.** Unit-test this exactly and reuse it in the full-turn e2e test:

- **Purchase:** 50 head, pay weight 22,500 lb, $380.00/cwt, freight $600, commission $0,
  purchased 2026-10-01.
- **Costs:** drug + other costs total $10,000.00. One death.
- **Sale:** 49 head sold 2027-03-01 (151 days), 31,850 lb, $330.00/cwt, commission $1,000,
  no other sale expenses.

| Output | Expected |
|---|---|
| purchase_cost | $86,100.00 |
| lb_gained | 9,800.0 |
| adg | 1.324 lb/day (9,800 / 49 / 151) |
| cog | $1.0204/lb |
| dead_purchase | $1,722.00 |
| cog_incl_death | $1.1961/lb |
| total_cost | $96,100.00 |
| gross_sales | $105,105.00 |
| net_proceeds | $104,105.00 |
| breakeven_cwt | $304.87 ((96,100 + 1,000) / 318.50) |
| net_profit | $8,005.00 |
| profit_per_head_in | $160.10 |
| death_loss_pct | 2.0% |

### 5.8 Group gain from tape weights

For an active lot, show group-average estimated gain between two tape-weight sessions **only**
when all of these hold:

- n ≥ 12 animals measured in both sessions
- the sessions are ≥ 60 days apart

Otherwise show "Not enough data for a reliable estimate." Individual ADG from tape weights is
never displayed.

## 6. Void pattern

Records are never deleted. Voiding sets `voided_at` and a required `void_reason` of at least 5
characters. Voided rows:

- are excluded from every calculation
- show struck-through in history views
- can't be un-voided (re-enter the record instead)

Voiding an administration restores its `remaining_ml` to the bottle. The chute screen's
"Undo last calf" voids that calf's processing event and all of its administrations in one
transaction.

## 7. Save reliability (Wi-Fi, not offline)

- Every chute and sick-pen write uses a client-generated UUID and is sent as
  `upsert(..., { onConflict: 'id', ignoreDuplicates: true })`, or through an RPC that is
  idempotent on id.
- A per-device **outbox** in `localStorage` holds any write not yet confirmed. Retry with
  exponential backoff (1s, 2s, 4s, capped at 30s). It flushes on reconnect and on app load.
- Each calf card shows a status chip: `Saving… | Saved ✓ | Retrying (n) | Failed — tap to
  retry`.
- A session can't be closed while its outbox has pending items.
- **Required e2e test:** go offline mid-save → the chip shows Retrying → come back online → it
  shows Saved ✓ → the DB has exactly one row per record, no duplicates.

## 8. Screens

### General UI rules

- Chute and sick-pen screens: touch targets ≥ 56 px, body text ≥ 18 px, high contrast (readable
  in sunlight).
- No hover-only interactions.
- Numeric inputs use `inputmode="decimal"` and a large on-screen keypad component.
- Must work in landscape 1280×800 and portrait 800×1280.
- Every other screen must be usable on a phone (390×844).

### 8.1 Dashboard

Shows:

- active lots, with head count on hand
- **Rechecks due today and overdue**
- animals currently in withdrawal, with clear dates
- bottles expiring within 30 days, and products with less than one lot's worth of doses on hand
- open processing sessions

Subscribes to Realtime so new treatments and rechecks appear without a refresh.

### 8.2 Lots

- List and detail views. New-lot form covers the purchase fields.
- **Add animals** three ways:
  - tag range (e.g., 101–150)
  - paste or upload a CSV of tags
  - one at a time
- Lot detail has tabs: Animals · Sessions · Treatments · Costs · Sales · Closeout.

### 8.3 Chute mode (the most important screen)

1. **Start session:** pick the lot, protocol, session kind, and crew. For each product in the
   protocol, pick the bottle in use (defaults to the open bottle, otherwise the
   earliest-expiring in-stock one). Show lot numbers.
2. **Per calf:**
   - A large tag field with keypad. It looks up the animal; if the tag isn't found, offer
     "Add to lot".
   - Temp (optional), tape weight (optional).
   - The protocol checklist: each step shows the product, computed dose, sites, route and site,
     and is **pre-marked as given**. Tapping a step toggles it to Skipped and asks for a reason
     (preset chips plus free text).
   - Steps marked `feeders_only` are auto-skipped for replacement candidates, with the reason
     prefilled.
   - A big **Save & Next** button.
3. **Header:** processed count / lot head, the outbox status, and **Undo last calf**.
4. **Change bottle** is available at any time (for when a bottle runs dry).
5. **Close session:** summary of head processed, doses per product, mL used per bottle,
   skipped items, and fevers flagged.

### 8.4 Sick pen

- **Pull entry:** tag lookup opens an animal side panel showing:
  - arrival date
  - metaphylaxis product and date, with the day counter
  - prior treatments
  - withdrawal status
- Enter signs (big D/A/R toggles), temp, and diagnosis. The app computes the pull number and the
  suggested steps (§5.4) with doses. Confirm, then set a recheck date (default +3 days).
- **Rechecks list:** mark each Recovered, Chronic, or Re-pull (starts a new treatment).
- **Record death** from here or from the animal page.

### 8.5 Inventory

Bottles grouped by product, showing remaining mL, expiration, and status. Add bottle, discard
bottle (with reason).

### 8.6 Setup (owner only)

- Products: edit catalog; `needs_label_verification` shows as a yellow badge until cleared.
- Protocols: ordered steps, pull numbers, the NSAID threshold, and vet approval fields. Editing a
  protocol that has been used creates a new version rather than mutating the old one.
- Members, farm settings, and fever thresholds.

### 8.7 Reports

- **Closeout** per lot (§5.7), print-friendly.
- **Treatment record export** (CSV, BQA fields): date, tag, product, lot#, dose, route, site,
  given by, withdrawal clear date.
- **Withdrawal report.**
- **Processing session summary.**

## 9. Seed data (`supabase/seed.sql`)

Every seeded product has `needs_label_verification = true`. Withdrawal days are as the owner
supplied them and must be verified against actual labels.

| Product | Class | Basis | Dose mL | Route/site | Max/site | WD days | Meta. interval |
|---|---|---|---|---|---|---|---|
| Tulathromycin | macrolide | per_100lb | 1.1 | SC neck | 10 | 18 | 7 |
| Intranasal MLV IBR/PI3/BRSV | vaccine_intranasal | per_head | 2 | intranasal | – | 21 | – |
| MLV 5-way injectable | vaccine_mlv_resp | per_head | 2 | SC neck | – | 21 | – |
| Clostridial 7-way | vaccine_clostridial | per_head | 2 | SC neck | – | 21 | – |
| Doramectin injectable | anthelmintic_ml | per_100lb | 0.91 | SC neck | 10 | 35 | – |
| Fenbendazole 10% | anthelmintic_bz | per_100lb | 2.3 | oral | – | 8 | – |
| Dinoprost | prostaglandin | per_head | 5 | IM neck | – | 0 | – |
| Implant (Ralgro) | implant | per_head | 1 (each) | implant, ear | – | 0 | – |
| Florfenicol | phenicol | per_100lb | 6 | SC neck | 10 | 38 | – |
| Flunixin | nsaid | per_100lb | 2 | IV/IM neck | 10 | 4 | – |
| Enrofloxacin | fluoroquinolone | per_100lb | 3.4 | SC neck | 20 | 28 | – |

Dinoprost gets a `human_safety_note`: "Handle with gloves. Women of childbearing age and people
with asthma use caution."

**Protocols** (seeded with `approved_by` null):

- **"Fall Receiving — High Risk" (processing):**
  - Arrival: intranasal MLV, clostridial 7-way, tulathromycin, doramectin, fenbendazole,
    dinoprost (heifers), implant (feeders_only)
  - Booster session steps: MLV 5-way, clostridial 7-way
- **"BRD Treatment" (treatment), NSAID threshold 104.0°F:**
  - Pull 1: florfenicol, plus flunixin (conditional)
  - Pull 2: enrofloxacin
  - Pull 3+: beyond protocol

The dashboard shows a banner, "Protocols not yet vet-approved", until `approved_by` is set.

The dev-only seed (`supabase/seed.dev.sql`) adds a demo farm, users for each role, and the
golden-case lot.

## 10. Testing requirements

**Unit (Vitest)** — every function in `src/lib/domain/`:
- dosing brackets at the edges (400, 401, 449.9, 450, 451)
- 0.5 mL rounding
- site splits
- weight-source priority
- pull numbering per diagnosis, beyond-protocol behavior
- metaphylaxis interval on days 0, 6, 7, 8
- same-class warning
- withdrawal max with voided rows excluded
- inventory math
- closeout golden case plus zero-denominator cases
- §5.8 thresholds

**Database (pgTAP)** — for every table:
- RLS enabled
- non-member reads 0 rows
- vet can't insert
- hand can't edit products or protocols
- nobody can delete the protected tables

Also:
- inventory decrement trigger and void restore
- `withdrawal_clear_date` and `cost_cents` snapshots match the TS domain functions for the
  same inputs (shared fixtures in `tests/fixtures/*.json`)
- the unique active-tag constraint

**E2E (Playwright, tablet projects)** — each spec starts from `db reset` plus the dev seed:
1. Create a lot and add tags 101–150.
2. Chute session: process 50 calves using the keypad, including one skipped step, one fever
   calf flagged as sick on arrival, one bottle change mid-session, and one "Undo last calf".
   Assert the doses in the DB, the bottle remaining mL, and the session summary.
3. Outbox offline/online test (§7).
4. Sick pen: a pull on day 5 triggers the metaphylaxis dialog. Pull 1 → pull 2 → pull 3 shows
   beyond protocol. A recheck resolves as recovered.
5. Death recorded; the animal is excluded from head on hand.
6. **Full turn:** reproduce the §5.7 golden case end to end through the UI (lot, costs to
   $10,000, one death, sale of 49), and assert every closeout number on the report page.
7. Role test: a vet user can view the closeout but sees no edit controls, and server actions
   reject vet writes.
8. Visual check: screenshot the chute screens in both orientations and assert no horizontal
   scroll.

**Coverage target:** 95% line coverage on `src/lib/domain/`. No target elsewhere.
