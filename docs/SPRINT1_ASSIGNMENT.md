# Immediate Sprint 1 Assignment

## Scope

This file contains only the eight `READY` issues that should be assigned immediately. It excludes every `WAITING` issue until its code dependency merges and every `BLOCKED` issue until its named decision is approved. No GitHub issue has been created or assigned by this document.

## danielnguyendbk

### Ordered checklist

1. **DB-01 ([#4](https://github.com/danielnguyendbk/intercity-bus-management/issues/4)) — Migration/database governance**
   - Confirm Django migrations as the only schema mechanism and prohibit running the reference SQL.
   - Publish the migration author/reviewer/merge-order checklist.
   - Require clean-database, forward, reverse and DDL evidence appropriate to each schema PR.
   - Define one migration-producing branch per app and one designated shared-staging operator.
   - Expected output: reviewed governance checklist usable by all three domain owners.
   - Migration review: no application migration; this issue establishes the mandatory DB review gate.
   - Required reviewers: `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.

2. **PAY-01 ([#2](https://github.com/danielnguyendbk/intercity-bus-management/issues/2)) — SePay configuration/environment contract**
   - Freeze the documented environment-variable names without adding real values.
   - Define missing/invalid configuration behavior and redacted error/log requirements.
   - Keep API-08 signing/header/timestamp details explicitly TBD.
   - Add only secret-free configuration tests/fixtures when implementation begins; do not create Payment models.
   - Expected output: approved, testable configuration contract for later verifier/QR/parser work.
   - Migration review: no.
   - Required reviewer: `NguyenLeHoaiTam` for secret/config boundary.

3. **DB-02 ([#3](https://github.com/danielnguyendbk/intercity-bus-management/issues/3)) — Shared MySQL staging workflow**
   - Draft the isolated-local-development and integration-branch-only staging flow.
   - Define backup, designated operator, migration evidence, schema/trigger/view checks and smoke checks.
   - Keep host, credentials and secrets out of Git.
   - Separate local verification from staging and live SePay/Google acceptance.
   - Expected output: secret-free, copy-pasteable staging/backup/restore verification runbook.
   - Migration review: no schema change; future staging migrations still require DB-01 evidence.
   - Required reviewers: `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.

### Do not assign yet

PAY-02 and PAY-04 remain blocked by API-08 verified SePay signing/payload fixtures. PAY-03 remains blocked by the unapproved VietQR format/encoding contract. Payment persistence PAY-05/PAY-06 must wait for approved Booking migrations.

## NguyenLeHoaiTam

### Ordered checklist

1. **ACC-01 ([#1](https://github.com/danielnguyendbk/intercity-bus-management/issues/1)) — Expand Custom User and Employee tests**
   - Preserve `accounts/0001_initial.py` exactly.
   - Add coverage for required unique email, nullable unique phone and username uniqueness.
   - Verify password hashing and rejection of role/staff privilege injection.
   - Cover User timestamps/role separation and Employee driver-license/type validation.
   - Run the applicable suite on Python 3.12/MySQL 8 where DB constraints matter.
   - Expected output: stronger Accounts model/service regression suite.
   - Migration review: no.
   - Required reviewer: `danielnguyendbk`.

2. **ACC-03 ([#7](https://github.com/danielnguyendbk/intercity-bus-management/issues/7)) — RBAC permission foundation**
   - Define reusable permissions from `User.role`, not `is_staff`/`is_superuser`.
   - Preserve `SessionAuthentication` and public hooks for search/seat availability.
   - Test Customer, Ticket Agent, Dispatcher, Admin, anonymous and inactive-user cases.
   - Keep the permission module independent of downstream business apps.
   - Expected output: documented permission API and complete allow/deny unit matrix.
   - Migration review: no.
   - Required reviewers: `vgh203`, `LeVuHao`, `danielnguyendbk`.

### Do not assign yet

ACC-02 needs approved logout/CSRF/error behavior. ACC-04/ACC-05 need approved Google verified-email/inactive/linking behavior. ACC-06 needs API-01, DB-09 and OPS-11. ACC-07 waits for those APIs.

## vgh203

### Ordered checklist

1. **OPS-01 ([#8](https://github.com/danielnguyendbk/intercity-bus-management/issues/8)) — Station model and migration**
   - Implement only the approved Station data contract and Django-managed conventions.
   - Add unique-code, active-state, field/default and FK/deletion tests.
   - Generate an authoritative Operations migration; never execute reference SQL.
   - Produce clean-MySQL migration and DDL evidence for review.
   - Expected output: Station model/migration/tests that unblock OPS-02.
   - Migration review: required before merge by `danielnguyendbk`.
   - Other reviewer: none.

2. **OPS-03 ([#5](https://github.com/danielnguyendbk/intercity-bus-management/issues/5)) — Bus model**
   - Coordinate migration numbering/merge order with OPS-01; avoid competing Operations migrations.
   - Implement license plate, name, type, capacity and status from the approved contract.
   - Test unique plate, positive capacity and approved choices.
   - Do not import or create Booking/Ticket models; defer active-Ticket safeguards.
   - Produce clean-MySQL migration and DDL evidence for review.
   - Expected output: Bus model/migration/tests that unblock OPS-04 and contribute to OPS-08.
   - Migration review: required before merge by `danielnguyendbk`.
   - Other reviewer: none.

### Immediate sequencing note

OPS-01 and OPS-03 are both ready, but the safest order for one Operations owner is OPS-01 first and OPS-03 second. After their direct dependencies merge, OPS-02 and OPS-04 move from `WAITING` to `READY`; they are intentionally not included in this immediate assignment file.

## LeVuHao

### Ordered checklist

1. **BKG-02 ([#6](https://github.com/danielnguyendbk/intercity-bus-management/issues/6)) — Define booking/search test scenarios**
   - Map BR-016–BR-023, BR-032–BR-034 and BR-041 to positive and negative scenarios.
   - Cover public search, seat snapshots, authenticated creation, multi-seat rollback, duplicate-seat races, expiry, cancellation and check-in.
   - Mark API-03/API-04/API-05 and DB-05 branches as TBD without choosing outcomes.
   - Refer to Operations models by approved contract only; do not create placeholder models or migrations.
   - Identify fixtures/data states needed later without embedding secrets or real webhook payloads.
   - Expected output: traceable scenario matrix that guides BKG-03–BKG-12 once dependencies merge.
   - Migration review: no.
   - Required reviewers: `vgh203`, `NguyenLeHoaiTam`, `danielnguyendbk`.

### Do not assign yet

BKG-01 remains blocked by stable Trip/BusSeat contracts and OPEN_QUESTIONS DB-01/02/05/06. BKG-03/BKG-04 wait for Operations and Booking persistence. No Booking, Ticket or Payment model should be created during this immediate assignment.

## Immediate assignment totals

- `danielnguyendbk`: 3 READY issues — DB-01 (#4), PAY-01 (#2), DB-02 (#3).
- `NguyenLeHoaiTam`: 2 READY issues — ACC-01 (#1), ACC-03 (#7).
- `vgh203`: 2 READY issues — OPS-01 (#8), OPS-03 (#5).
- `LeVuHao`: 1 READY issue — BKG-02 (#6).
- Total: 8 READY issues.
