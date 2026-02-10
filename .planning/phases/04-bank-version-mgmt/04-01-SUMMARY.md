---
phase: 04-bank-version-mgmt
plan: 01
subsystem: api
tags: [crud-api, validation, slug-generation, bank-versions]

# Dependency graph
requires:
  - phase: 01-foundation-database/02
    provides: Database schema with plan_versions table
  - phase: 03-shared-config-mgmt/01
    provides: API validation patterns and error handling
provides:
  - REST API for bank version CRUD operations (GET, POST, PATCH, DELETE)
  - Slug generation utility for URL-friendly identifiers
  - Comprehensive validation for version data and slug uniqueness
  - Soft delete mechanism via is_active flag
affects: [04-02-bank-version-ui, calculation-engine, bank-specific-routing]

# Tech tracking
tech-stack:
  added: []
  patterns: [slug-validation, soft-delete, uniqueness-checking, override-nullable-pattern]

key-files:
  created: [src/app/api/admin/versions/route.ts, src/app/api/admin/versions/[id]/route.ts, src/lib/utils.ts]
  modified: []

key-decisions:
  - "GET endpoint returns all versions ordered by created_at DESC for chronological listing"
  - "POST endpoint validates slug format with regex pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/"
  - "Slug uniqueness enforced at API level with 409 status on conflicts"
  - "PATCH endpoint checks slug uniqueness excluding current record to allow other field updates"
  - "DELETE performs soft delete by setting is_active=false to preserve data"
  - "Override fields (LOC, interest rate, head count) accept null to use plan_config defaults"
  - "Slug generation utility handles edge cases: special chars, multiple spaces, leading/trailing hyphens"

patterns-established:
  - "Slug validation pattern: lowercase alphanumeric with hyphens, no spaces or special chars except hyphens"
  - "Uniqueness check pattern: query existing records before insert/update, return 409 on conflict"
  - "Soft delete pattern: use is_active boolean flag, preserve data in database"
  - "Override validation pattern: if provided, validate type and range; if null, allow for default fallback"
  - "ID route pattern: verify resource exists first, return 404 if not found, then proceed with operation"

issues-created: []

# Metrics
duration: 12min
completed: 2026-02-09
---

# Phase 4 Plan 01: Bank Version API Summary

**REST API for CRUD operations on plan_versions with slug generation and comprehensive validation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-09T21:30:00-06:00
- **Completed:** 2026-02-09T21:42:00-06:00
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Complete REST API for bank version management with 4 HTTP methods
- GET endpoint fetches all versions in reverse chronological order
- POST endpoint creates versions with comprehensive field validation
- PATCH endpoint updates versions with optional field support
- DELETE endpoint performs soft delete by setting is_active flag
- Slug uniqueness enforced at database query level before insert/update
- Slug format validation prevents invalid URL identifiers
- generateSlug utility transforms bank names into URL-friendly slugs
- Override fields support nullable pattern for plan_config fallback
- Error responses follow established pattern (400/404/409/500 with messages)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create bank version CRUD API routes** - `221845b` (feat)
2. **Task 2: Add slug generation utility** - `d88e5cb` (feat)

**Plan metadata:** `[pending]` (docs: complete bank version API plan)

## Files Created/Modified

**Created:**
- `src/app/api/admin/versions/route.ts` - GET all versions and POST new version with validation
- `src/app/api/admin/versions/[id]/route.ts` - PATCH update and DELETE (soft delete) for specific version
- `src/lib/utils.ts` - generateSlug utility function for URL-friendly identifiers

**Modified:**
- None

## Decisions Made

**1. Comprehensive slug validation with regex pattern**
- **Implementation:** Pattern `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` enforces lowercase alphanumeric with hyphens only
- **Rationale:** Ensures clean, predictable URLs for bank-specific routing; prevents spaces, special chars, or invalid URL segments

**2. Slug uniqueness check at API level with 409 status**
- **Implementation:** Query plan_versions for existing slug before insert; for updates, exclude current record ID
- **Rationale:** Database has unique constraint, but API-level check provides better error messages and prevents database exceptions

**3. Soft delete via is_active flag**
- **Implementation:** DELETE endpoint sets is_active=false instead of removing row
- **Rationale:** Preserves historical data and audit trail; allows potential reactivation; prevents foreign key issues if versions are referenced

**4. Override fields validate only when provided (nullable pattern)**
- **Implementation:** Check `!== undefined && !== null` before validation; allow null to pass through
- **Rationale:** Null means "use plan_config default" per Phase 1 design; only validate when bank provides custom value

**5. Positive value validation for financial overrides**
- **Implementation:** line_of_credit_override and total_head_override must be > 0 if provided
- **Rationale:** Negative LOC or head count are nonsensical; prevents data entry errors

**6. Interest rate range validation (0-100)**
- **Implementation:** interest_rate_pct_override must be between 0 and 100 if provided
- **Rationale:** Percentage values outside this range are invalid; follows same pattern as Phase 3 mortality rate validation

**7. generateSlug utility without external dependencies**
- **Implementation:** Pure TypeScript function with regex replacements for transformation
- **Rationale:** Avoids adding slugify npm package for simple transformation; keeps bundle size small; full control over slug format

**8. PATCH allows partial updates**
- **Implementation:** Build update object dynamically with only provided fields
- **Rationale:** Flexible API allows updating single field without sending entire object; reduces payload size

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Implementation proceeded smoothly following established patterns from Phase 3 config API.

## API Details

### GET /api/admin/versions
- Returns array of all versions ordered by created_at DESC
- Returns empty array if no versions exist
- Returns 500 on database errors

### POST /api/admin/versions
- **Required fields:**
  - `bank_name` (string, 1-255 chars)
  - `slug` (string, lowercase-hyphenated format matching `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`)
- **Optional fields:**
  - `line_of_credit_override` (number, positive if provided)
  - `interest_rate_pct_override` (number, 0-100 if provided)
  - `total_head_override` (integer, positive if provided)
- **Behavior:**
  - Validates slug format and uniqueness before insert
  - Sets is_active=true by default
  - Null override fields use plan_config defaults
- **Responses:**
  - 201 with created version object on success
  - 400 on validation errors (missing fields, invalid format, out-of-range values)
  - 409 on slug conflict (already exists)
  - 500 on database errors

### PATCH /api/admin/versions/[id]
- **Optional fields:** All fields from POST (bank_name, slug, is_active, overrides)
- **Behavior:**
  - Verifies version exists (404 if not found)
  - Validates slug uniqueness excluding current record if slug being changed
  - Only updates fields provided in request body
- **Responses:**
  - 200 with updated version object on success
  - 400 on validation errors
  - 404 if version ID not found
  - 409 on slug conflict
  - 500 on database errors

### DELETE /api/admin/versions/[id]
- **Behavior:**
  - Verifies version exists (404 if not found)
  - Sets is_active=false (soft delete)
  - Does not remove row from database
- **Responses:**
  - 200 with success message on deactivation
  - 404 if version ID not found
  - 500 on database errors

## Utility Function

### generateSlug(text: string): string
- **Transformations:**
  1. Convert to lowercase
  2. Trim whitespace
  3. Remove special characters except spaces and hyphens
  4. Replace spaces and underscores with hyphens
  5. Replace multiple consecutive hyphens with single hyphen
  6. Remove leading and trailing hyphens
- **Examples:**
  - "First National Bank" → "first-national-bank"
  - "Cameron State Bank" → "cameron-state-bank"
  - "Community Bank & Trust" → "community-bank-trust"
  - "Bank  of   America" → "bank-of-america"
- **Export:** Available for use in both API routes and UI forms

## Validation Details

### bank_name
- Required on POST
- Type: string
- Min length: 1 character (after trim)
- Max length: 255 characters
- Trimmed before storage

### slug
- Required on POST
- Type: string
- Format: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` (lowercase alphanumeric with hyphens)
- Must be unique across all plan_versions
- No spaces or special characters except hyphens

### line_of_credit_override
- Optional (null allowed for default)
- Type: number
- Must be positive (> 0) if provided
- Cannot be NaN

### interest_rate_pct_override
- Optional (null allowed for default)
- Type: number
- Range: 0-100 if provided
- Cannot be NaN

### total_head_override
- Optional (null allowed for default)
- Type: integer (whole number)
- Must be positive (> 0) if provided

### is_active
- Type: boolean
- Default: true on creation
- Updated to false on soft delete

## Next Phase Readiness

**Ready for Phase 4 Plan 02: Bank Version Admin UI**

- REST API fully functional with all CRUD operations
- Validation prevents invalid data at API level
- Slug generation utility ready for UI integration
- Soft delete preserves data integrity
- Error responses provide clear feedback for UI
- Follows established patterns from Phase 3 config API

**No blockers** - UI can now be built on top of this API foundation

---
*Phase: 04-bank-version-mgmt*
*Completed: 2026-02-09*
