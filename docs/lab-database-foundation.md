# Laboratory database foundation

Migration source: `database/migrations/013_lab_catalog_foundation.sql`

Status: source created; migration not executed.

## Scope

The migration creates only Laboratory catalog and price-configuration tables:

- `lab_categories`
- `lab_tests`
- `lab_test_parameters`
- `lab_profiles`
- `lab_profile_tests`
- `lab_combinations`
- `lab_combination_items`
- `lab_prices`

It does not create lab orders, samples, results, reports, billing records,
roles, permissions, APIs, or user-interface components. It does not insert
catalog or price data and does not alter any existing HMS table.

## Live database preflight

The read-only preflight was performed against the configured database before
the migration source was written.

- Database: `hospital_management`
- Server version: MySQL 9.7.1 (Homebrew)
- Database character set: `utf8mb4`
- Database collation: `utf8mb4_unicode_ci`
- Relevant existing tables use InnoDB and `utf8mb4_unicode_ci`.
- None of the eight proposed table names existed.
- None of the proposed unique-constraint names existed.
- Existing laboratory data is represented by generic `services` and
  `patient_services`; no dedicated Lab catalog table existed.

The live schema is ahead of the static `database/schema.sql` in several areas.
Later migrations and `server/src/db/initialize.js` add visit relationships,
dynamic service mappings, Short Stay, billing, RBAC metadata, and other
columns that are absent from or differ from the initial schema file. This
migration therefore does not rewrite `schema.sql` or silently normalize any
existing definition.

## Integrity rules

- Catalog codes are stable and unique within their table.
- Parameter codes are unique within a test.
- A test belongs to one category but may be individually non-orderable while
  remaining available to profiles.
- Profile/test membership is unique.
- A combination item references exactly one test or profile. A CHECK
  constraint enforces the reference shape, while separate unique keys prevent
  the same test or profile being repeated in one combination.
- A price references exactly one test, profile, or combination.
- `PENDING` prices require `price_amount IS NULL`.
- `CONFIGURED` prices require a non-negative amount. Therefore `0.00` means an
  explicitly configured free price and never means missing configuration.
- Effective end time, when supplied, must be later than the start time.
- Foreign keys use restrictive deletion so catalog history cannot be removed
  through cascading deletes.

## Effective-period limitation

MySQL unique keys can prevent two price records for the same item from having
the same `effective_from` value, but they cannot declaratively prevent every
possible overlap between two arbitrary date/time ranges. The migration adds
target-specific lookup indexes and effective-period checks, but a later price
management service must validate under a transaction that an inserted or
updated active interval does not overlap another active interval for the same
catalog item.

No claim is made that non-overlapping periods are fully enforced by this
Step 2 schema alone.

## Execution plan for later approval

1. Back up the schema and confirm `DATABASE()` is `hospital_management`.
2. Re-run the proposed-table and constraint-name conflict checks.
3. If any proposed table exists, stop and compare its full definition; do not
   execute the migration partially.
4. Apply the migration in file order. MySQL DDL is not assumed to be
   transactionally rollback-safe.
5. Inspect all eight table definitions, foreign keys, CHECK constraints, and
   indexes after execution.
6. Confirm that all eight tables contain zero rows and that existing HMS table
   counts are unchanged.

## Future compatibility

The catalog IDs and price snapshots can later be referenced by visit-based Lab
orders, sample collection, parameter results, reports, and billing. Those
transactional tables are intentionally outside Step 2. No facility column is
included because the HMS does not yet have an approved facility model; a
future facility-aware price layer can reference these stable catalog entities.
