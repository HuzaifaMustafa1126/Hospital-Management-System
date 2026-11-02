# Doctor Lab Ordering Database Foundation

## Scope

Migration `015_doctor_lab_ordering_foundation.sql` prepares three additive
clinical-order tables. It does not create ordering APIs, UI, charges, samples,
results, permissions, or catalog records.

## Live-schema preflight

The migration was designed against the live local database:

- Database: `hospital_management`
- MySQL: `9.7.1`
- Character set/collation: `utf8mb4` / `utf8mb4_unicode_ci`
- `patients.id`, `patient_visits.id`, `doctors.id`, and all Lab Catalog IDs:
  `BIGINT UNSIGNED`
- `users.id`: `VARCHAR(191)` with `utf8mb4_unicode_ci`
- The eight Lab Catalog tables are present.
- `lab_orders`, `lab_order_items`, and `lab_order_item_tests` are absent.
- No migration-history table exists; migration application is tracked by
  repository files and direct schema inspection.

The live database is authoritative. Older bootstrap SQL in
`server/src/db/initialize.js` does not fully describe the evolved schema and
must not be used as the migration type source.

## Relationships

`lab_orders` belongs to one patient visit, patient, ordering doctor, and
creating user. There is no one-order-per-visit constraint, so a visit can have
multiple orders. `source_context` records whether the future order originated
from Services or Short Stay without inserting into either workflow table.

`lab_order_items` belongs to one order and references exactly one test,
profile, or combination. The item stores stable catalog code/name snapshots,
quantity, price-state snapshots, and the source `lab_prices` record where one
exists. Separate target-specific unique keys prevent duplicate lines for the
same catalog item in one order; quantity represents intentional repetition.

`lab_order_item_tests` expands every ordered item to its exact leaf tests.
Individual tests produce one component row. Profiles use their ordered
`lab_profile_tests`. Combinations must be expanded through their configured
test/profile members to leaf tests, de-duplicating repeated test IDs while
preserving the first configured order. The snapshot remains stable when later
catalog memberships change.

## Price snapshot policy

Snapshot amounts are per-unit amounts. A future billable line total would use
`final_price_snapshot * quantity`; that calculation is not implemented here.

- `PENDING`: list, discount, and final snapshots are all `NULL`.
- `CONFIGURED`: all three amounts are non-negative; discount cannot exceed
  list price; final price must equal list price minus discount.
- Explicitly free: configured list `0.00`, discount `0.00`, final `0.00`.
- Currency is restricted to `PKR`, matching the current catalog contract.
- A nullable `source_price_id` preserves the exact effective price source.

Pending orders must never be converted to zero. A future price-resolution
workflow must lock and update the item explicitly, preserve old/new data in an
audit event, and must not modify historical patient charges.

## Doctor and visit validation design

Foreign keys preserve entity existence but cannot enforce the cross-table
patient/visit and doctor/visit rules without altering existing parent keys.
The future Step 5.2 transaction must derive identity from the authenticated
user and lock the visit before insert:

1. Resolve an active doctor using `doctors.user_id = authenticatedUserId`.
2. Lock `patient_visits` by visit ID and join its patient and department.
3. Require `patient_visits.patient_id` to equal the requested patient.
4. Require `patient_visits.doctor_id` to equal the resolved doctor.
5. Require an active `doctor_departments` row for the visit department.
6. Require `user_departments` for the authenticated user and department.
7. Permit ordering only for `IN_CONSULTATION` or `SHORT_STAY`, matching the
   current doctor workflow.
8. Ignore any client-supplied doctor or creator identity.
9. Resolve catalog availability, effective price, snapshots, component tests,
   order number, order rows, and audit log inside one transaction.

`patients.doctor_id` is intentionally not part of authorization.

## Order-number policy

`order_number` has a unique database key. The future service should generate a
stable non-guess-based or sequence-backed value such as a date-prefixed value
with sufficient entropy, insert it inside the order transaction, and handle a
duplicate-key collision by generating a new candidate before any commit. The
database migration does not synthesize business identifiers.

## Constraint and index notes

- Foreign keys used by the item-reference CHECK use `ON UPDATE RESTRICT`,
  avoiding the MySQL CHECK/cascading-action conflict encountered in migration
  013.
- All deletion actions are restrictive to protect clinical history.
- Item target CHECKs enforce exactly one catalog reference.
- Unique target keys avoid duplicate catalog lines per order while allowing
  many different items and many orders per visit.
- Visit/patient/doctor/status indexes support future doctor, visit-history,
  laboratory queue, and audit-oriented queries.
- Component uniqueness prevents duplicate test snapshots and duplicate sort
  positions within an item.

## Migration compatibility and risks

MySQL DDL implicitly commits. A failure after one CREATE TABLE can leave a
partially applied migration. Migration 015 is intentionally non-idempotent so
duplicate execution fails visibly instead of accepting a drifted definition.

Migration 015 assumes all eight Lab Catalog tables already exist. A fresh
installation cannot blindly apply the original migration 013 because its
CHECK/`ON UPDATE CASCADE` conflict remains recorded in that historical file.
Clean installations require the separately reviewed corrected catalog
baseline before applying 015.

The runtime initializer currently creates and evolves legacy HMS tables but
does not apply numbered Lab migrations. Migration 015 is not added to the
initializer, preventing startup-side schema changes.

## Safe execution and recovery plan

Before execution:

1. Confirm local server identity, `DATABASE()`, and MySQL version.
2. Verify all three new tables are absent and all parent definitions still
   match the preflight.
3. Verify no other schema migration is running.
4. Create and verify a fresh backup outside the source tree.
5. Record the migration SHA-256 and execute migration 015 exactly once.

After execution, inspect every `SHOW CREATE TABLE`, foreign key, CHECK, index,
collation, and zero row count. Compare protected HMS table counts and schema
fingerprints with the pre-execution capture.

If execution partially fails, stop without retrying. Identify only tables
created by migration 015 and confirm they contain zero rows and match the
migration exactly. With an approved backup available, remove those new tables
child-first (`lab_order_item_tests`, `lab_order_items`, `lab_orders`) only
after explicit approval. Never drop or alter an existing HMS or Lab Catalog
table. Correct the migration source in a new reviewed migration before retry.
