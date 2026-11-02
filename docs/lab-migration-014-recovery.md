# Lab Migration 014 recovery notes

Migration source: `database/migrations/014_lab_catalog_foundation_recovery.sql`

Status: recovery source created; migration not executed.

## Why Migration 014 exists

Migration 013 was executed once against the development database. Its first
six tables were created successfully, but MySQL rejected
`lab_combination_items` with error 3823 because columns referenced by its
CHECK constraint also used `ON UPDATE CASCADE` foreign-key actions. Execution
stopped before `lab_prices` was attempted.

Migration 014 completes only that verified partial state by creating:

- `lab_combination_items`
- `lab_prices`

It retains the original columns, types, indexes, unique constraints, CHECK
constraints, and restrictive deletion behavior. Foreign keys use
`ON UPDATE RESTRICT`, which is appropriate for stable catalog IDs and avoids
the CHECK/cascading-action conflict.

## Required preflight before execution

Migration 014 is valid only when all of the following are true:

1. The database is `hospital_management` on the reviewed MySQL environment.
2. `lab_categories`, `lab_tests`, `lab_test_parameters`, `lab_profiles`,
   `lab_profile_tests`, and `lab_combinations` exist with the Migration 013
   definitions.
3. Those six tables contain zero rows or otherwise remain in the explicitly
   reviewed recovery state.
4. `lab_combination_items` and `lab_prices` do not exist.
5. The protected HMS schema and data remain unchanged.

Do not use `IF NOT EXISTS` to bypass a definition mismatch, and do not rerun
Migration 013.

## Clean-install compatibility warning

A fresh database must not blindly execute the current Migration 013 followed
by Migration 014. Migration 013 will still fail at
`lab_combination_items`, leaving a partial schema before a migration runner can
reliably advance to 014.

Future clean installations require a separate reviewed baseline correction,
such as a corrected consolidated Lab foundation migration or an installation
process that distinguishes fresh setup from this development recovery path.
That baseline correction is intentionally not implemented in Step 3.3, and
Migration 013 remains unchanged as the historical record of the partial
execution.

## Remaining application-level rule

The price constraints enforce target shape, pending/configured amount rules,
and valid individual date periods. Arbitrary overlaps between two active
effective price ranges cannot be fully excluded by these MySQL constraints;
a later pricing service must validate overlaps transactionally.
