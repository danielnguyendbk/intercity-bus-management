# Three-Sprint Implementation Plan

## Operating rules for every sprint

- This is a backlog sequencing plan, not a GitHub assignment action.
- A blocked issue may be discussed and have its decision record prepared, but implementation starts only after every named decision and code dependency is complete.
- Each developer uses an isolated local MySQL 8 database. Only the designated lead migrates shared staging from the integrated branch.
- Every schema change receives Database Owner review. Do not run the reference SQL and do not rewrite `accounts/0001_initial.py`.
- Keep one migration-producing branch per app at a time; merge in dependency order.
- Unit/build/integration evidence does not constitute live Google/SePay/staging acceptance.

## Sprint 1 — Foundations, contracts and pure components

### Objectives

- Expand the Accounts foundation without changing its initial migration.
- Establish Station/Route and Bus/BusSeat foundations, then prepare the Trip contract.
- Put migration and shared-MySQL governance in place before additional schema lands.
- Prepare SePay components that can be pure and persistence-free once verified fixtures/contracts are available.
- Freeze the Booking/Ticket contract and prepare its test scenarios without creating Booking/Payment models early.

### Planned issues

#### Accounts lane — `NguyenLeHoaiTam`

- ACC-01 — Expand Custom User and Employee tests (`UNBLOCKED`).
- ACC-03 — RBAC permission foundation (`UNBLOCKED`).
- ACC-04 — Google OAuth integration (`BLOCKED` until verified-email/inactive-user behavior is approved; provider calls remain mocked in tests).
- ACC-02 — Register/login/logout APIs (`BLOCKED` until logout/error/CSRF contract is approved).
- ACC-05 — Google account-linking behavior (`BLOCKED` until explicit-link contract is approved).

ACC-01 and ACC-03 should land before dependent APIs. Decision work for ACC-04 can proceed in parallel, but implementation waits for the missing OAuth behavior decisions; live Google configuration remains separate acceptance.

#### Operations lane — `vgh203`

- OPS-01 — Station model and migration (`UNBLOCKED`).
- OPS-03 — Bus model (`UNBLOCKED`).
- OPS-02 — Route model and validation (after OPS-01).
- OPS-04 — BusSeat model and seat layout (after OPS-03).
- OPS-08 — Trip model and migration (after OPS-02 and OPS-03).

Preferred migration order is Station → Route and Bus → BusSeat → Trip. OPS-01 and OPS-03 may be developed in parallel only with explicit migration numbering/merge coordination; otherwise merge them sequentially.

#### Database lane — Repository owner / lead

- DB-01 — Migration/database governance (`UNBLOCKED`).
- DB-02 — Shared MySQL staging workflow (`UNBLOCKED`, after DB-01 process baseline).
- Begin resolving OPEN_QUESTIONS DB-01, DB-02, DB-04, DB-05 and DB-06 with the required owners. These are decision activities, not authorization to implement blocked issues.

#### SePay pure-component lane — Repository owner / lead

- PAY-01 — SePay configuration/environment contract (`UNBLOCKED`).
- PAY-02 — Signature verification (`BLOCKED` until API-08 supplies verified signing fixtures).
- PAY-03 — VietQR builder (`BLOCKED` until exact format/encoding fixtures are approved).
- PAY-04 — Webhook payload parser (`BLOCKED` until API-08 supplies the actual payload contract).

No Payment or PaymentTransaction model may be created in this sprint. Once decisions are recorded, PAY-02–PAY-04 remain pure, deterministic and DB-free.

#### Booking preparation lane — `LeVuHao`

- BKG-02 — Define booking/search test scenarios (`UNBLOCKED`).
- BKG-01 — Freeze Booking/Ticket model contract (`BLOCKED` until upstream contracts and OPEN_QUESTIONS DB-01/DB-02/DB-05/DB-06 are approved).

This lane must not create placeholder Trip, BusSeat, Booking, Ticket or Payment models. Scenarios awaiting a decision must remain marked TBD.

### Sprint 1 exit criteria

- ACC-01/ACC-03 and the approved mocked OAuth scope pass tests.
- Operations base migrations through Trip are locally green and ready for/under Database Owner review.
- DB-01 governance and DB-02 staging workflow are documented and accepted by the team.
- Booking test matrix exists; BKG-01 has recorded approvals for every schema blocker before implementation proceeds.
- SePay configuration is frozen; pure components start only with verified fixtures.
- No Payment persistence exists and no reference SQL has been run.

## Sprint 2 — Stabilized Operations and complete Bookings

### Entry criteria

- Sprint 1 schema dependencies are merged in order.
- Trip and BusSeat model contracts are stable enough for Bookings FKs.
- OPEN_QUESTIONS DB-01, DB-02, DB-04, DB-05 and DB-06 have approved answers where required.
- API-01/API-02/API-04/API-05 and the common error contract are approved before affected APIs begin.

### Planned issues

#### Accounts completion — `NguyenLeHoaiTam`

- Complete ACC-02 and ACC-05 after their decisions.
- ACC-06 — Employee CRUD after API-01 and DB-09 are approved and TripStaffAssignment integration is available.
- ACC-07 — Accounts API tests after ACC-02–ACC-06.

#### Operations stabilization — `vgh203`

- Complete OPS-08 if not already merged.
- OPS-09 — Trip lifecycle rules.
- OPS-10 — Bus schedule conflict validation.
- OPS-11 — TripStaffAssignment model/service.
- OPS-12 — Staff assignment and overlap validation.
- OPS-05 — Operations services.
- OPS-06 — Operations CRUD APIs after API-01/API-02.
- OPS-07 — Operations tests.

Database Owner reviews schema and concurrency behavior through DB-03 before downstream schema is accepted. Active-ticket safeguards may only be finalized after BKG-05 exists; do not create Ticket early inside Operations.

#### Bookings implementation — `LeVuHao`

- BKG-01 — Freeze Booking/Ticket model contract.
- BKG-05 — Booking and Ticket models/migrations after DB-03 and upstream schema stability.
- BKG-03 — Public trip-search selector.
- BKG-04 — Seat-availability selector.
- BKG-06 — Multi-seat booking service.
- BKG-07 — Double-booking protection.
- BKG-08 — Booking expiration after execution mechanism/cutoff decisions.
- BKG-09 — Pending booking cancellation after staff scope and cross-domain contract decisions.
- BKG-10 — Ticket check-in after the time-window decision.
- BKG-11 — Booking APIs.
- BKG-12 — Booking integration/concurrency tests.

#### Database reviews — Repository owner / lead

- DB-03 — Review Operations migrations.
- DB-04 — Review Booking migrations.

DB-04 is the formal gate before Payment persistence. It must include zero/forward/reverse migration evidence and real MySQL verification of composite/generated/unique behavior.

### Sprint 2 exit criteria

- Operations models/services and approved APIs are stable; bus/staff concurrency tests pass on MySQL.
- DB-03 is approved and Bookings consumes stable Trip/BusSeat contracts.
- Booking/Ticket migrations are approved by DB-04 and migrate cleanly from zero and the integration baseline.
- Two concurrent requests for one Trip/seat produce exactly one active Ticket and no partial Booking.
- Search, availability, booking, expiry, cancellation and check-in pass all approved BKG-02 scenarios; TBD cases remain excluded and visible.
- Payment persistence is still absent until DB-04 approval is recorded.

## Sprint 3 — Payments, cross-domain integration, reporting and demo

### Entry criteria

- DB-04 has approved Booking/Ticket migrations.
- BKG-05/BKG-06 and required cancellation/expiry contracts exist.
- SePay/VietQR fixtures and API-06–API-11 decisions are approved.
- Review-state mapping and PaymentTransaction mutability are frozen.

### Planned issues

#### Payment persistence and flow — Repository owner / lead

- PAY-05 — Payment/PaymentTransaction model contract.
- PAY-06 — Payment models/migrations.
- PAY-07 — Create payment intent.
- PAY-09 — Webhook idempotency.
- PAY-10 — Payment matching/validation.
- PAY-08 — SePay webhook processing.
- PAY-11 — Late payment `REVIEW_REQUIRED` flow.
- PAY-12 — Payment reconciliation.
- PAY-13 — Revenue/reporting queries after API-09 formulas are approved.
- PAY-14 — Payment integration tests.

PAY-02–PAY-04 from Sprint 1 must be complete before the webhook business flow. Authentication must precede parsing/persistence, and SePay success must remain unavailable as a manual action.

#### Integration and final validation — Repository owner / lead, reviewed by all domain owners

- INT-01 — Booking → Payment integration.
- INT-04 — Role/permission integration tests.
- INT-03 — Failure/retry scenarios.
- INT-02 — Full happy-path test.
- INT-05 — Demo seed/data preparation after API-12 is approved.

INT-01 should land before Payment intent/webhook completion so cross-domain call direction and lock order are fixed. INT-02 is the final automated path; live HTTPS SePay acceptance remains a separate, explicitly reported verification.

### Sprint 3 exit criteria

- Payment/PaymentTransaction migrations pass DB review and clean MySQL migration checks.
- Authenticated, on-time SePay webhook transitions Payment, Booking and Tickets exactly once; invalid authenticity creates no business record.
- Late/wrong/extra transactions enter only the approved review states and never regrant seats.
- Revenue uses successful Payments only and matches direct DB queries under approved date formulas.
- Cross-domain failure/retry, role and concurrency suites pass.
- Approved demo seed process creates no plaintext passwords, secrets or real webhook payloads.
- Automated happy path passes; any staging/live Google or SePay checks are reported separately and are not inferred from mocks.

## Backlog summary

- **Total planned issues:** 54
- **Immediately actionable:** 8
- **Blocked:** 46
- **Critical-path issues:** DB-01, OPS-01, OPS-02, OPS-03, OPS-04, OPS-08, OPS-10, OPS-11, OPS-12, DB-03, BKG-01, BKG-05, DB-04, BKG-06, BKG-07, PAY-05, PAY-06, INT-01, PAY-07, PAY-10, PAY-09, PAY-08, PAY-14, BKG-12, ACC-07, OPS-07 and INT-02.

## Recommended first six GitHub issues to create later

Do not create them yet. When the user authorizes issue creation, create these first:

1. DB-01 — Migration/database governance — Repository owner / lead.
2. ACC-01 — Expand Custom User and Employee tests — `NguyenLeHoaiTam`.
3. ACC-03 — RBAC permission foundation — `NguyenLeHoaiTam`.
4. OPS-01 — Station model and migration — `vgh203`.
5. BKG-02 — Define booking/search test scenarios — `LeVuHao`.
6. PAY-01 — SePay configuration/environment contract — Repository owner / lead.

OPS-03 is the next recommended issue after this initial set; coordinate it with OPS-01 to avoid competing Operations migration numbering.
