# Laboratory rate-sheet import manifest

Status: reviewed preparation only; not executed.

Source workbook: `Final Rate List Red Cresent General Hospital.xlsx`

Source SHA-256: `383ece09ff80502a3ca63cb09420aaf0292d14dbe9c917dc4970ce9c1ed222fb`

Source sheet: `Currently Possible Tests`, numbered entries 1–39, Excel rows 3–41.

## Import constants

- Currency: `PKR`.
- Initial `effective_from`: capture one actual execution timestamp in PKT when
  the future approved import transaction starts; reuse that exact timestamp
  for every initial price row. The timestamp is deliberately not frozen in
  this preparation document.
- Initial `effective_to`: `NULL`.
- Initial records: active unless this manifest explicitly says otherwise.
- Missing price: `pricing_status=PENDING`, `price_amount=NULL`.
- Configured zero is not used by this manifest.
- Units and reference ranges: `NULL`; the workbook does not supply them.
- Source ordering is retained through category, parameter, profile-member,
  and combination-member sort order.

## `lab_categories`

The workbook has no category column. These seven administrative categories
provide the required test foreign key without changing its clinical groups.

| Sort | Code | Name |
|---:|---|---|
| 10 | `CHEMISTRY` | Clinical Chemistry |
| 20 | `COAGULATION` | Coagulation |
| 30 | `HEMATOLOGY` | Hematology |
| 40 | `IMMUNOLOGY` | Immunology and Serology |
| 50 | `BLOOD_BANK` | Blood Bank |
| 60 | `URINALYSIS` | Urinalysis |
| 70 | `CARDIAC` | Cardiac Markers |

## Source rows, `lab_tests`, parameters, and test prices

`Source price` records the workbook value. A merged profile price is not an
individual component rate. `Import price` records the approved value that
will be represented in `lab_prices`.

| Excel row | Original group / name | Final display name | Stable code | Category | Individually orderable | Relationships | Parameters | Source price | Import price/status | Seconds | Override or mapping note |
|---:|---|---|---|---|---|---|---|---|---|---:|---|
| 3 | LFT / ALT | ALT | `ALT` | `CHEMISTRY` | Yes | LFT member | ALT | LFT merged PKR 500 | PKR 150 `CONFIGURED` | 150 | Approved individual rate |
| 4 | LFT / AST | AST | `AST` | `CHEMISTRY` | Yes | LFT member | AST | LFT merged PKR 500 | PKR 150 `CONFIGURED` | 150 | Approved individual rate |
| 5 | LFT / ALP | ALP | `ALP` | `CHEMISTRY` | Yes | LFT member | ALP | LFT merged PKR 500 | PKR 150 `CONFIGURED` | 150 | Approved individual rate |
| 6 | LFT / T. Bilirubin | Total Bilirubin | `BILIRUBIN_TOTAL` | `CHEMISTRY` | Yes | LFT and bilirubin-combination member | T. Bilirubin | LFT merged PKR 500 | `PENDING`, NULL | 30 | No approved individual rate |
| 7 | LFT / D. Bilirubin | Direct Bilirubin | `BILIRUBIN_DIRECT` | `CHEMISTRY` | Yes | LFT and bilirubin-combination member | D. Bilirubin | LFT merged PKR 500 | `PENDING`, NULL | 90 | No approved individual rate |
| 8 | LFT / I. Bilirubin | Indirect Bilirubin | `BILIRUBIN_INDIRECT` | `CHEMISTRY` | Yes | LFT and bilirubin-combination member | I. Bilirubin | LFT merged PKR 500 | `PENDING`, NULL | 90 | No approved individual rate |
| 9 | LFT / T. Protein | Total Protein | `TOTAL_PROTEIN` | `CHEMISTRY` | Yes | LFT member | T. Protein | PKR 200 | PKR 200 `CONFIGURED` | 30 | Display name normalized |
| 10 | LFT / Albumin | Albumin | `ALBUMIN` | `CHEMISTRY` | Yes | LFT member | Albumin | PKR 200 | PKR 200 `CONFIGURED` | 30 | None |
| 11 | LFT / Globulin | Globulin | `GLOBULIN` | `CHEMISTRY` | Yes | LFT member | Globulin | PKR 200 | PKR 200 `CONFIGURED` | 90 | Preserve source behavior |
| 12 | LFT / A/G Ratio | A/G Ratio | `AG_RATIO` | `CHEMISTRY` | Yes | LFT member | A/G Ratio | PKR 100 | PKR 100 `CONFIGURED` | 0 | Source explicitly records zero seconds |
| 13 | RFT / Urea | Urea | `UREA` | `CHEMISTRY` | Yes | RFT grouping; Urea/Creatinine combination | Urea | PKR 150 | PKR 150 `CONFIGURED` | 30 | RFT is grouping only, not a profile |
| 14 | RFT / Creatinine | Creatinine | `CREATININE` | `CHEMISTRY` | Yes | RFT grouping; Urea/Creatinine combination | Creatinine | PKR 150 | PKR 150 `CONFIGURED` | 180 | RFT is grouping only, not a profile |
| 15 | RFT / Uric Acid | Uric Acid | `URIC_ACID` | `CHEMISTRY` | Yes | RFT grouping | Uric Acid | PKR 200 | PKR 200 `CONFIGURED` | 60 | RFT is grouping only, not a profile |
| 16 | FLP / HDL | HDL | `HDL` | `CHEMISTRY` | No | FLP member | HDL | FLP merged PKR 700 | `PENDING`, NULL | 60 | Component cannot be ordered separately |
| 17 | FLP / LDL | LDL | `LDL` | `CHEMISTRY` | No | FLP member | LDL | FLP merged PKR 700 | `PENDING`, NULL | 60 | Component cannot be ordered separately |
| 18 | FLP / Cholesterole | Total Cholesterol | `TOTAL_CHOLESTEROL` | `CHEMISTRY` | No | FLP member | Cholesterole | FLP merged PKR 700 | `PENDING`, NULL | 30 | Correct display spelling; preserve source in description |
| 19 | FLP / Triglycerides | Triglycerides | `TRIGLYCERIDES` | `CHEMISTRY` | No | FLP member | Triglycerides | FLP merged PKR 700 | `PENDING`, NULL | 30 | Component cannot be ordered separately |
| 20 | Glucose / BSR/BSF | Glucose / BSR/BSF | `BLOOD_GLUCOSE` | `CHEMISTRY` | Yes | None | BSR/BSF | PKR 100 | PKR 100 `CONFIGURED` | 30 | Preserve combined source label |
| 21 | Serum Electrolytes / Na+ | Sodium (Na+) | `SODIUM` | `CHEMISTRY` | No | Serum Electrolytes member | Na+ | Profile merged PKR 500 | `PENDING`, NULL | NULL | Merged 180 seconds belongs to profile |
| 22 | Serum Electrolytes / K+ | Potassium (K+) | `POTASSIUM` | `CHEMISTRY` | No | Serum Electrolytes member | K+ | Profile merged PKR 500 | `PENDING`, NULL | NULL | Do not invent component time |
| 23 | Serum Electrolytes / Cl- | Chloride (Cl-) | `CHLORIDE` | `CHEMISTRY` | No | Serum Electrolytes member | Cl- | Profile merged PKR 500 | `PENDING`, NULL | NULL | Do not invent component time |
| 24 | Coagulation Profile / PT with INR | PT with INR | `PT_INR` | `COAGULATION` | Yes | PT/INR + aPTT combination | PT with INR | PKR 300 | PKR 300 `CONFIGURED` | 240 | Preserve source display name |
| 25 | Coagulation Profile / ApTT | aPTT | `APTT` | `COAGULATION` | Yes | PT/INR + aPTT combination | ApTT | PKR 300 | PKR 300 `CONFIGURED` | 300 | Normalize display capitalization |
| 26 | CBC | CBC | `CBC` | `HEMATOLOGY` | Yes | None | Hb; TLC; RBC; Platelets; Granulocytes; Lymphocytes; Mix | PKR 200 | PKR 200 `CONFIGURED` | 90 | Seven source parameters |
| 27 | ESR | ESR | `ESR` | `HEMATOLOGY` | Yes | None | ESR | PKR 100 | PKR 100 `CONFIGURED` | 3600 | None |
| 28 | CRP / CRP Qualitative | CRP Qualitative | `CRP_QUALITATIVE` | `IMMUNOLOGY` | Yes | None | CRP Qualitative | PKR 700 | PKR 700 `CONFIGURED` | 120 | None |
| 29 | RA Factor / RA Factor Qualitative | RA Factor Qualitative | `RA_FACTOR_QUALITATIVE` | `IMMUNOLOGY` | Yes | None | RA Factor Qualitative | PKR 300 | PKR 300 `CONFIGURED` | 120 | None |
| 30 | ANA/SLE | ANA/SLE | `ANA_SLE` | `IMMUNOLOGY` | Yes | None | ANA/SLE | PKR 400 | PKR 400 `CONFIGURED` | 120 | Preserve source combined label |
| 31 | Blood Group | Blood Group | `BLOOD_GROUP` | `BLOOD_BANK` | Yes | None | Blood Group | PKR 100 | PKR 100 `CONFIGURED` | 120 | None |
| 32 | Cross Match / Cross Match with Screening | Cross Match | `CROSS_MATCH` | `BLOOD_BANK` | No | Cross Match + Screening combination | None supplied | PKR 300 component of `300+700` | PKR 300 `CONFIGURED` | NULL | Source gives 600 seconds only for combined workflow |
| 32 | Cross Match / Cross Match with Screening | Screening | `SCREENING` | `BLOOD_BANK` | No | Cross Match + Screening combination | None supplied | PKR 700 component of `300+700` | PKR 700 `CONFIGURED` | NULL | Do not assume separate orderability or time |
| 33 | U R/E / Urine Routine Examination | Urine Routine Examination | `URINE_RE` | `URINALYSIS` | Yes | None | None supplied | PKR 200 | PKR 200 `CONFIGURED` | 120 | Do not invent result parameters |
| 34 | UPT / Urine Pregnancy Test | Urine Pregnancy Test | `UPT` | `URINALYSIS` | Yes | None | Urine Pregnancy Test | PKR 50 | PKR 50 `CONFIGURED` | 120 | None |
| 35 | HbsAg | HBsAg | `HBSAG` | `IMMUNOLOGY` | Yes | None | HbsAg | E35:E36 merged PKR 200 | PKR 200 `CONFIGURED` | 120 | Normalize display capitalization |
| 36 | anti-HCV | anti-HCV | `ANTI_HCV` | `IMMUNOLOGY` | Yes | None | anti-HCV | E35:E36 merged PKR 200, ambiguous | `PENDING`, NULL | 120 | Approved pending rule overrides merged source cell |
| 37 | anti-HIV | anti-HIV | `ANTI_HIV` | `IMMUNOLOGY` | Yes | None | anti-HIV | PKR 150 | PKR 150 `CONFIGURED` | 120 | None |
| 38 | Syphillis/ RPR/ VDRL | Syphilis/RPR/VDRL | `SYPHILIS_RPR_VDRL` | `IMMUNOLOGY` | Yes | None | Syphillis/RPR/VDRL | PKR 150 | PKR 150 `CONFIGURED` | 120 | Correct display spelling; preserve source alias |
| 39 | H. Pylori | H. pylori | `H_PYLORI` | `IMMUNOLOGY` | Yes | None | H. Pylori | PKR 200 | PKR 200 `CONFIGURED` | 120 | Normalize display capitalization |
| 40 | MP | MP | `MALARIA_PARASITE` | `HEMATOLOGY` | Yes | None | MP | PKR 150 | PKR 150 `CONFIGURED` | 120 | Preserve displayed clinical name; expanded meaning in description only |
| 41 | Trop-I | Trop-I | `TROPONIN_I` | `CARDIAC` | Yes | None | Trop-I | PKR 400 | PKR 400 `CONFIGURED` | 120 | Preserve displayed clinical name |

## `lab_test_parameters`

Parameter codes use the owning test code for a single parameter. CBC uses the
seven codes below. Parameter ordering follows the workbook. All units and
reference ranges are `NULL`.

| Test | Parameter codes in order |
|---|---|
| LFT, RFT, FLP, electrolyte, and coagulation component tests | One source-named parameter per test, using the test code |
| `BLOOD_GLUCOSE` | `BSR_BSF` |
| `CBC` | `HB`, `TLC`, `RBC`, `PLATELETS`, `GRANULOCYTES`, `LYMPHOCYTES`, `MIX` |
| `ESR` | `ESR` |
| `CRP_QUALITATIVE` | `CRP_QUALITATIVE` |
| `RA_FACTOR_QUALITATIVE` | `RA_FACTOR_QUALITATIVE` |
| `ANA_SLE` | `ANA_SLE` |
| `BLOOD_GROUP` | `BLOOD_GROUP` |
| `UPT` | `UPT` |
| `HBSAG` | `HBSAG` |
| `ANTI_HCV` | `ANTI_HCV` |
| `ANTI_HIV` | `ANTI_HIV` |
| `SYPHILIS_RPR_VDRL` | `SYPHILIS_RPR_VDRL` |
| `H_PYLORI` | `H_PYLORI` |
| `MALARIA_PARASITE` | `MP` |
| `TROPONIN_I` | `TROP_I` |
| `CROSS_MATCH`, `SCREENING`, `URINE_RE` | No parameter; source does not define result-level fields |

Total parameter records: 43.

## `lab_profiles` and `lab_profile_tests`

| Profile code | Display name | Members in order | Processing seconds | Price |
|---|---|---|---:|---:|
| `LFT` | LFT (Liver Function Test) | `ALT`, `AST`, `ALP`, `BILIRUBIN_TOTAL`, `BILIRUBIN_DIRECT`, `BILIRUBIN_INDIRECT`, `TOTAL_PROTEIN`, `ALBUMIN`, `GLOBULIN`, `AG_RATIO` | NULL | PKR 500 |
| `FLP` | FLP (Fasting Lipid Profile) | `HDL`, `LDL`, `TOTAL_CHOLESTEROL`, `TRIGLYCERIDES` | NULL | PKR 500 |
| `SERUM_ELECTROLYTES` | Serum Electrolytes | `SODIUM`, `POTASSIUM`, `CHLORIDE` | 180 | PKR 500 |

All three profiles are active and orderable. FLP's workbook price of PKR 700
is retained as source metadata but overridden by the approved PKR 500 rate.

RFT is not inserted into `lab_profiles`. Its source label is preserved in the
three tests' descriptions and this manifest because the approved workflow
does not permit a complete RFT order or price.

Total profile records: 3. Total profile membership records: 17.

## `lab_combinations` and `lab_combination_items`

| Combination code | Display name | Members in order | Price | Source/approval |
|---|---|---|---:|---|
| `BILIRUBIN_PANEL` | Bilirubin Panel | `BILIRUBIN_TOTAL`, `BILIRUBIN_DIRECT`, `BILIRUBIN_INDIRECT` | PKR 300 | Approved combination; individual prices pending |
| `UREA_CREATININE` | Urea + Creatinine | `UREA`, `CREATININE` | PKR 250 | Approved discounted combination |
| `PT_INR_APTT` | PT/INR + aPTT | `PT_INR`, `APTT` | PKR 500 | Approved discounted combination |
| `CROSS_MATCH_SCREENING` | Cross Match with Screening | `CROSS_MATCH`, `SCREENING` | PKR 1,000 | Workbook breakdown PKR 300 + PKR 700 |

The current combination table has no processing-time column. The source's
600-second Cross Match with Screening time must be retained in the combination
description and import audit data; it must not be allocated to either member.

Total combination records: 4. Total combination membership records: 9.

## `lab_prices`

Create one initial price record for each of 40 tests, three profiles, and four
combinations. Use the single runtime PKT timestamp described above.

- Test prices: 40 records; 29 configured and 11 pending.
- Profile prices: 3 configured records.
- Combination prices: 4 configured records.
- Total prices: 47 records; 36 configured and 11 pending.

Pending test prices are:

1. `BILIRUBIN_TOTAL`
2. `BILIRUBIN_DIRECT`
3. `BILIRUBIN_INDIRECT`
4. `HDL`
5. `LDL`
6. `TOTAL_CHOLESTEROL`
7. `TRIGLYCERIDES`
8. `SODIUM`
9. `POTASSIUM`
10. `CHLORIDE`
11. `ANTI_HCV`

## Approved overrides

| Catalog item | Source value | Import value | Reason |
|---|---:|---:|---|
| `ALT` | No individual value; LFT merged at PKR 500 | PKR 150 | Approved individual rate |
| `AST` | No individual value; LFT merged at PKR 500 | PKR 150 | Approved individual rate |
| `ALP` | No individual value; LFT merged at PKR 500 | PKR 150 | Approved individual rate |
| `FLP` | PKR 700 | PKR 500 | Approved complete-profile rate |
| `ANTI_HCV` | Ambiguous merged PKR 200 cell | PENDING, NULL | Approved pending rule |
| `BILIRUBIN_PANEL` | No explicit workbook combination value | PKR 300 | Approved combined rule |
| `UREA_CREATININE` | Individual total PKR 300 | PKR 250 | Approved discounted combination |
| `PT_INR_APTT` | Individual total PKR 600 | PKR 500 | Approved discounted combination |

## Future ordering precedence

This manifest configures catalog recognition only. Future order pricing must
apply these rules without implementing them during import:

1. An explicitly selected complete profile uses its fixed profile price and
   never adds member-test prices or member combinations.
2. An explicitly selected combination uses its fixed combination price and
   never adds its component prices.
3. For individual selections that exactly satisfy an approved combination,
   apply the combination once and consume those component selections.
4. The bilirubin combination must not be added when LFT is selected as a
   profile.
5. FLP and Serum Electrolytes components are not individually orderable.
6. Cross Match and Screening are non-orderable components; the combined
   offering is the approved workflow.
7. If multiple combinations could consume the same selected test, future
   ordering must return a controlled choice/conflict unless a separately
   approved deterministic precedence policy exists. It must not choose an
   arbitrary or maximally discounted result silently.

## Dry-run and idempotent execution plan

The future importer must perform a no-write dry run before execution:

1. Verify the workbook SHA-256 and manifest version.
2. Confirm `DATABASE()` is `hospital_management`.
3. Read all eight target-table counts and existing codes.
4. Validate that all 39 numbered source entries are represented.
5. Validate 40 unique test codes, 43 unique per-test parameter codes, three
   unique profile codes, and four unique combination codes.
6. Validate foreign-key targets, relationship ordering, and duplicate members.
7. Validate exactly 47 prices, including 11 pending NULL amounts.
8. Capture the proposed execution timestamp in PKT for review without writing.
9. Report every action as `INSERT`, `REUSE`, or `CONFLICT`.
10. Treat a matching stable code and equivalent immutable identity as `REUSE`;
    retain its existing ID.
11. Treat type, relationship, or materially different name/code mappings as
    `CONFLICT`; never overwrite them automatically.
12. Never update an existing historical price. Insert a new effective record
    only after target locking and overlap validation.
13. Abort before writes if any conflict or count mismatch exists.

After explicit execution approval, perform all catalog writes and audit events
in one database transaction in this foreign-key order:

1. `lab_categories`
2. `lab_tests`
3. `lab_test_parameters`
4. `lab_profiles`
5. `lab_profile_tests`
6. `lab_combinations`
7. `lab_combination_items`
8. `lab_prices`

Lock pricing targets before checking effective-period overlaps. Roll back the
entire import and its audit events on any failure. Do not execute separate HTTP
mutations that could leave a partially imported workbook.

## Expected record counts

| Table | Manifest records |
|---|---:|
| `lab_categories` | 7 |
| `lab_tests` | 40 |
| `lab_test_parameters` | 43 |
| `lab_profiles` | 3 |
| `lab_profile_tests` | 17 |
| `lab_combinations` | 4 |
| `lab_combination_items` | 9 |
| `lab_prices` | 47 |
| **Total** | **170** |

These are proposed import counts, not current database counts.
