# Complete Task Assignment Plan

## Assignment rules

- This document assigns the approved backlog on paper only. No GitHub issue has been created or assigned.
- Repository Owner / Database + Payments + Integration Owner is `danielnguyendbk`, determined from the `origin` remote: `github.com/danielnguyendbk/intercity-bus-management`.
- Fixed ownership is preserved: ACC → `NguyenLeHoaiTam`; OPS → `vgh203`; BKG → `LeVuHao`; DB/PAY/INT → `danielnguyendbk`.
- `READY`: useful implementation can begin now. `WAITING`: no unresolved decision blocks its scope, but its prerequisite code must merge first. `BLOCKED`: a required contract/business/database decision remains unresolved.
- A schema-affecting issue cannot merge without explicit review by `danielnguyendbk` as Repository/DB Owner. Referenced-domain owners review cross-domain contracts but do not take ownership of another app's model or migration.
- `accounts/0001_initial.py` remains immutable. Django migrations remain authoritative.

## Complete 54-issue assignment matrix

| ID | Issue Title | Owner | Collaborator/Reviewer | Sprint | Status | Dependencies | Difficulty |
|---|---|---|---|---:|---|---|---|
| ACC-01 | Expand Custom User and Employee tests | NguyenLeHoaiTam | danielnguyendbk | 1 | READY | Existing Accounts baseline | Medium |
| ACC-02 | Register/login/logout APIs | NguyenLeHoaiTam | danielnguyendbk | 2 | BLOCKED | ACC-01, ACC-03; logout/CSRF/error contract | Medium |
| ACC-03 | RBAC permission foundation | NguyenLeHoaiTam | vgh203, LeVuHao, danielnguyendbk | 1 | READY | Existing custom User/session auth | Medium |
| ACC-04 | Google OAuth integration | NguyenLeHoaiTam | danielnguyendbk | 2 | BLOCKED | ACC-01 recommended; verified-email/inactive-user decisions | Hard |
| ACC-05 | Google account-linking behavior | NguyenLeHoaiTam | danielnguyendbk | 2 | BLOCKED | ACC-04; explicit-link/re-auth/unlink contract | Hard |
| ACC-06 | Employee CRUD | NguyenLeHoaiTam | vgh203; DB review: danielnguyendbk if schema changes | 2 | BLOCKED | ACC-03, OPS-11; API-01, DB-09 | Medium |
| ACC-07 | Accounts API tests | NguyenLeHoaiTam | danielnguyendbk | 2 | BLOCKED | ACC-02–ACC-06 and inherited decisions | Hard |
| OPS-01 | Station model and migration | vgh203 | DB review: danielnguyendbk | 1 | READY | Existing Phase 1 baseline; DB-01 parallel gate | Easy |
| OPS-02 | Route model and validation | vgh203 | DB review: danielnguyendbk | 1 | WAITING | OPS-01 | Medium |
| OPS-03 | Bus model | vgh203 | DB review: danielnguyendbk | 1 | READY | Existing Phase 1 baseline; DB-01 parallel gate | Easy |
| OPS-04 | BusSeat model and seat layout | vgh203 | DB review: danielnguyendbk; later BKG guard review: LeVuHao | 1 | WAITING | OPS-03 | Hard |
| OPS-05 | Operations services | vgh203 | NguyenLeHoaiTam, LeVuHao, danielnguyendbk | 2 | BLOCKED | Operations models, ACC-03; DB-06, DB-09 | Hard |
| OPS-06 | Operations CRUD APIs | vgh203 | NguyenLeHoaiTam, danielnguyendbk | 2 | BLOCKED | OPS-05, ACC-03; API-01, API-02 | Hard |
| OPS-07 | Operations tests | vgh203 | LeVuHao, danielnguyendbk | 2 | BLOCKED | OPS-01–OPS-06, OPS-08–OPS-12, BKG-05; inherited decisions | Hard |
| OPS-08 | Trip model and migration | vgh203 | DB review: danielnguyendbk | 1 | WAITING | OPS-02, OPS-03 | Medium |
| OPS-09 | Trip lifecycle rules | vgh203 | LeVuHao; DB review: danielnguyendbk if trigger/migration | 2 | BLOCKED | OPS-08, OPS-11, BKG-05; API-02, DB-06 | Hard |
| OPS-10 | Bus schedule conflict validation | vgh203 | DB review: danielnguyendbk | 2 | BLOCKED | OPS-08; OPEN_QUESTIONS DB-04 | Hard |
| OPS-11 | TripStaffAssignment model/service | vgh203 | NguyenLeHoaiTam; DB review: danielnguyendbk | 2 | WAITING | OPS-08, existing Employee | Medium |
| OPS-12 | Staff assignment and overlap validation | vgh203 | NguyenLeHoaiTam; DB review: danielnguyendbk | 2 | BLOCKED | OPS-10, OPS-11; OPEN_QUESTIONS DB-04, DB-09 | Hard |
| BKG-01 | Freeze Booking/Ticket model contract | LeVuHao | vgh203, NguyenLeHoaiTam; approval: danielnguyendbk | 2 | BLOCKED | OPS-04, OPS-08, DB governance; OQ DB-01/02/05/06 | Hard |
| BKG-02 | Define booking/search test scenarios | LeVuHao | vgh203, NguyenLeHoaiTam, danielnguyendbk | 1 | READY | Approved business rules; record TBD branches | Medium |
| BKG-03 | Public trip-search selector | LeVuHao | vgh203 | 2 | WAITING | OPS-01/02/04/08, BKG-05 | Medium |
| BKG-04 | Seat-availability selector | LeVuHao | vgh203 | 2 | WAITING | OPS-04, OPS-08, BKG-05 | Medium |
| BKG-05 | Booking and Ticket models/migrations | LeVuHao | vgh203, NguyenLeHoaiTam; DB review: danielnguyendbk | 2 | BLOCKED | BKG-01, OPS-04/08, DB-03; OQ DB-01/02/05/06 | Hard |
| BKG-06 | Multi-seat booking service | LeVuHao | vgh203, NguyenLeHoaiTam, danielnguyendbk | 2 | BLOCKED | BKG-03/04/05, OPS-09; OQ DB-05 | Hard |
| BKG-07 | Double-booking protection | LeVuHao | DB review: danielnguyendbk | 2 | BLOCKED | BKG-05/06, DB-04; OQ DB-02/error contract | Hard |
| BKG-08 | Booking expiration | LeVuHao | danielnguyendbk; DB review if trigger/migration | 2 | BLOCKED | BKG-05/06, INT-01; OQ DB-05/execution mechanism | Hard |
| BKG-09 | Pending booking cancellation | LeVuHao | NguyenLeHoaiTam, danielnguyendbk | 2 | BLOCKED | BKG-05, ACC-03, INT-01; API-05 | Hard |
| BKG-10 | Ticket check-in | LeVuHao | vgh203, NguyenLeHoaiTam | 2 | BLOCKED | BKG-05, OPS-09, ACC-03; API-04 | Medium |
| BKG-11 | Booking APIs | LeVuHao | vgh203, NguyenLeHoaiTam, danielnguyendbk | 2 | BLOCKED | ACC-03, BKG-03–BKG-10; API-04/05/error contract | Hard |
| BKG-12 | Booking integration/concurrency tests | LeVuHao | vgh203, danielnguyendbk | 2 | BLOCKED | BKG-03–BKG-11, DB-04, OPS-09/10; inherited decisions | Hard |
| DB-01 | Migration/database governance | danielnguyendbk | vgh203, LeVuHao, NguyenLeHoaiTam | 1 | READY | Existing Phase 1 baseline | Medium |
| DB-02 | Shared MySQL staging workflow | danielnguyendbk | vgh203, LeVuHao, NguyenLeHoaiTam | 1 | READY | Existing guidance; coordinate with DB-01 | Medium |
| DB-03 | Review Operations migrations | danielnguyendbk | Required domain reviewer: vgh203 | 2 | BLOCKED | Operations migrations; OQ DB-04/06/09 | Hard |
| DB-04 | Review Booking migrations | danielnguyendbk | Required domain reviewer: LeVuHao; upstream reviewer: vgh203 | 2 | BLOCKED | DB-03, BKG-01/05; OQ DB-01/02/05/06 | Hard |
| PAY-01 | SePay configuration/environment contract | danielnguyendbk | NguyenLeHoaiTam for secret/config boundary | 1 | READY | Existing env convention; DB-01 coordination | Easy |
| PAY-02 | SePay signature verification | danielnguyendbk | Security/contract review: NguyenLeHoaiTam | 2 | BLOCKED | PAY-01; API-08 verified signing contract | Hard |
| PAY-03 | VietQR builder | danielnguyendbk | LeVuHao for payment-intent output contract | 2 | BLOCKED | PAY-01; QR format/encoding contract | Medium |
| PAY-04 | SePay webhook payload parser | danielnguyendbk | LeVuHao | 2 | BLOCKED | PAY-02; API-08 payload fixtures/contract | Medium |
| PAY-05 | Payment/PaymentTransaction model contract | danielnguyendbk | Required domain reviewer: LeVuHao | 3 | BLOCKED | BKG-05, DB-04, PAY-04; DB-07/08, API-07/11 | Hard |
| PAY-06 | Payment models/migrations | danielnguyendbk | Required reviewer: LeVuHao; DB review: danielnguyendbk | 3 | BLOCKED | PAY-05, DB-04 and inherited decisions | Hard |
| PAY-07 | Create payment intent | danielnguyendbk | Required domain reviewer: LeVuHao | 3 | BLOCKED | PAY-03/06, BKG-06, INT-01; API-06/07 | Hard |
| PAY-08 | SePay webhook processing | danielnguyendbk | Required domain reviewer: LeVuHao; security review: NguyenLeHoaiTam | 3 | BLOCKED | PAY-02/04/06/09/10, INT-01; API-08, DB-07, API-11 | Hard |
| PAY-09 | Webhook idempotency | danielnguyendbk | Required domain reviewer: LeVuHao; DB review: danielnguyendbk if constraint changes | 3 | BLOCKED | PAY-04/06; API-08 replay contract | Hard |
| PAY-10 | Payment matching/validation | danielnguyendbk | Required domain reviewer: LeVuHao | 3 | BLOCKED | PAY-04/06/07; API-08, DB-07 | Hard |
| PAY-11 | Late payment REVIEW_REQUIRED flow | danielnguyendbk | Required domain reviewer: LeVuHao | 3 | BLOCKED | PAY-06/10; DB-07, API-10 | Hard |
| PAY-12 | Payment reconciliation | danielnguyendbk | NguyenLeHoaiTam, LeVuHao | 3 | BLOCKED | PAY-11, ACC-03; API-10, DB-08, API-11 | Hard |
| PAY-13 | Revenue/reporting queries | danielnguyendbk | vgh203, LeVuHao, NguyenLeHoaiTam | 3 | BLOCKED | PAY-06, BKG-05, OPS-08, ACC-03; API-09 | Hard |
| PAY-14 | Payment integration tests | danielnguyendbk | LeVuHao, NguyenLeHoaiTam | 3 | BLOCKED | PAY-01–PAY-13, INT-01; inherited decisions | Hard |
| INT-01 | Booking -> Payment integration | danielnguyendbk | Required collaborator/reviewer: LeVuHao | 3 | BLOCKED | BKG-05/06/08/09, PAY-05/06; DB-06, API-07/orchestration contract | Hard |
| INT-02 | Full happy-path test | danielnguyendbk | Required reviewers: vgh203, LeVuHao, NguyenLeHoaiTam | 3 | BLOCKED | ACC-07, OPS-07, BKG-12, PAY-14, INT-01 | Hard |
| INT-03 | Failure/retry scenarios | danielnguyendbk | Required reviewers: vgh203, LeVuHao, NguyenLeHoaiTam | 3 | BLOCKED | OPS-07, BKG-12, PAY-14, INT-01; error/API-08/DB-07 decisions | Hard |
| INT-04 | Role/permission integration tests | danielnguyendbk | Required reviewer: NguyenLeHoaiTam; reviewers: vgh203, LeVuHao | 3 | BLOCKED | ACC-03/07, OPS-06, BKG-11, PAY-08/12/13; API-01/05/09 | Hard |
| INT-05 | Demo seed/data preparation | danielnguyendbk | Required reviewers: vgh203, LeVuHao, NguyenLeHoaiTam; DB review if data migration | 3 | BLOCKED | Stable domain migrations, INT-02; API-12 | Medium |

## Assignment by developer

## NguyenLeHoaiTam

### Sprint 1

- **ACC-01 — Expand Custom User and Employee tests** — Dependency: existing Accounts baseline. Expected output: MySQL-aware model/service regression tests without changing `accounts/0001_initial.py`. Migration review: no. Other review: `danielnguyendbk` reviews baseline coverage.
- **ACC-03 — RBAC permission foundation** — Dependency: existing custom User and session authentication. Expected output: reusable role/ownership permission classes with a four-role test matrix. Migration review: no. Other review: `vgh203`, `LeVuHao` and `danielnguyendbk` review the public permission contract.

### Sprint 2

- **ACC-02 — Register/login/logout APIs** — Dependency: ACC-01/03 plus approved logout, CSRF and error contract. Expected output: session-only register/login/logout APIs and tests. Migration review: no. Other review: `danielnguyendbk`.
- **ACC-04 — Google OAuth integration** — Dependency: approved verified-email/inactive-user behavior. Expected output: mocked allauth Google flow that creates only safe Customer accounts. Migration review: no application migration expected. Other review: `danielnguyendbk`.
- **ACC-05 — Google account-linking behavior** — Dependency: ACC-04 and approved link/re-auth/unlink contract. Expected output: explicit authenticated linking with takeover protections. Migration review: no application migration expected. Other review: `danielnguyendbk`.
- **ACC-06 — Employee CRUD** — Dependency: ACC-03, OPS-11, API-01 and DB-09 decisions. Expected output: Admin CRUD/deactivate, Dispatcher read-only and reusable employee validation. Migration review: required only if model/constraint/index changes; `accounts/0001_initial.py` must not change. Other review: `vgh203` and `danielnguyendbk`.
- **ACC-07 — Accounts API tests** — Dependency: ACC-02–ACC-06. Expected output: full session/auth/OAuth/user/employee API regression suite. Migration review: no. Other review: `danielnguyendbk`.

### Sprint 3

- No primary Accounts issues. `NguyenLeHoaiTam` remains required reviewer for PAY-08/PAY-12/PAY-13 and INT-02–INT-05 where authentication, secret boundaries or RBAC are exercised.

## vgh203

### Sprint 1

- **OPS-01 — Station model and migration** — Dependency: Phase 1 baseline; DB-01 parallel merge gate. Expected output: Station model, authoritative migration and MySQL tests. Migration review: required by `danielnguyendbk`. Other review: none.
- **OPS-03 — Bus model** — Dependency: Phase 1 baseline; coordinate migration order with OPS-01. Expected output: Bus model/migration and field/constraint tests. Migration review: required by `danielnguyendbk`. Other review: none.
- **OPS-02 — Route model and validation** — Dependency: OPS-01 merge. Expected output: Route model/migration and origin/destination/numeric validation. Migration review: required by `danielnguyendbk`. Other review: none.
- **OPS-04 — BusSeat model and seat layout** — Dependency: OPS-03 merge. Expected output: BusSeat model/migration, layout and capacity/uniqueness protection; Ticket-dependent guard remains deferred. Migration review: required by `danielnguyendbk`. Other review: `LeVuHao` later reviews the active-Ticket guard contract.
- **OPS-08 — Trip model and migration** — Dependency: OPS-02 and OPS-03 merge. Expected output: stable Trip schema/read contract for Bookings. Migration review: required by `danielnguyendbk`. Other review: `LeVuHao` reviews the downstream Trip contract.

### Sprint 2

- **OPS-11 — TripStaffAssignment model/service** — Dependency: OPS-08 and existing Employee. Expected output: assignment schema/service with role/type/license validation. Migration review: required by `danielnguyendbk`. Other review: `NguyenLeHoaiTam` reviews Employee validation use.
- **OPS-10 — Bus schedule conflict validation** — Dependency: OPS-08 and approved OQ DB-04. Expected output: lock/overlap service, DB safeguard and concurrency tests. Migration review: required by `danielnguyendbk`. Other review: none.
- **OPS-12 — Staff assignment and overlap validation** — Dependency: OPS-10/11 plus OQ DB-04/09. Expected output: employee locking, overlap/reschedule safeguards and MySQL concurrency tests. Migration review: required by `danielnguyendbk`. Other review: `NguyenLeHoaiTam`.
- **OPS-09 — Trip lifecycle rules** — Dependency: OPS-08/11, BKG-05 and API-02/DB-06 decisions. Expected output: atomic approved state transitions and open prerequisites. Migration review: required if approved DB enforcement adds triggers/migrations. Other review: `LeVuHao`, `danielnguyendbk`.
- **OPS-05 — Operations services** — Dependency: Operations models, ACC-03 and DB-06/09 decisions. Expected output: transactional write services and stable domain errors. Migration review: no unless scope adds schema; any such change requires `danielnguyendbk`. Other review: `NguyenLeHoaiTam`, `LeVuHao`.
- **OPS-06 — Operations CRUD APIs** — Dependency: OPS-05, ACC-03 and API-01/02 decisions. Expected output: approved service-backed Operations endpoints and serializers. Migration review: no. Other review: `NguyenLeHoaiTam`, `danielnguyendbk`.
- **OPS-07 — Operations tests** — Dependency: complete Operations surface and BKG-05 active-Ticket contract. Expected output: model/service/API/migration/concurrency regression suite. Migration review: no new migration; DDL assertions reviewed by `danielnguyendbk`. Other review: `LeVuHao`.

### Sprint 3

- No primary Operations issues. `vgh203` remains required reviewer for PAY-13 and INT-02–INT-05 where Operations data/contracts are consumed.

## LeVuHao

### Sprint 1

- **BKG-02 — Define booking/search test scenarios** — Dependency: approved business rules only. Expected output: traceable positive/negative/concurrency scenario matrix with unresolved branches explicitly marked TBD. Migration review: no. Other review: `vgh203`, `NguyenLeHoaiTam` and `danielnguyendbk` review their domain boundaries.

### Sprint 2

- **BKG-01 — Freeze Booking/Ticket model contract** — Dependency: stable OPS-04/08 plus approved OQ DB-01/02/05/06. Expected output: signed-off model/FK/index/constraint/generated-column/expiry contract. Migration review: contract approval required from `danielnguyendbk`; no migration produced yet. Other review: `vgh203`, `NguyenLeHoaiTam`.
- **BKG-05 — Booking and Ticket models/migrations** — Dependency: BKG-01, OPS-04/08 and DB-03. Expected output: authoritative models, reversible migrations and DDL tests. Migration review: required by `danielnguyendbk`. Other review: `vgh203`, `NguyenLeHoaiTam`.
- **BKG-03 — Public trip-search selector** — Dependency: Operations contracts and BKG-05. Expected output: read-only future/open Trip search with snapshot seat count. Migration review: no. Other review: `vgh203`.
- **BKG-04 — Seat-availability selector** — Dependency: OPS-04/08 and BKG-05. Expected output: read-only active-seat/occupancy snapshot selector. Migration review: no. Other review: `vgh203`.
- **BKG-06 — Multi-seat booking service** — Dependency: BKG-03/04/05, OPS-09 and approved OQ DB-05. Expected output: atomic pending Booking plus held Tickets with rollback and server-derived fare. Migration review: no new migration. Other review: `vgh203`, `NguyenLeHoaiTam`, `danielnguyendbk`.
- **BKG-07 — Double-booking protection** — Dependency: BKG-05/06, DB-04 and approved generated-key/error contract. Expected output: generated key/unique protection, 409 mapping and real MySQL race test. Migration review: required by `danielnguyendbk`. Other review: none.
- **BKG-08 — Booking expiration** — Dependency: BKG-05/06, INT-01 and approved cutoff/execution mechanism. Expected output: idempotent locked expiry worker/lazy flow and Payment cancellation contract. Migration review: required if approved DB trigger/data/schema migration is introduced. Other review: `danielnguyendbk`.
- **BKG-09 — Pending booking cancellation** — Dependency: BKG-05, ACC-03, INT-01 and API-05. Expected output: atomic owner/staff cancellation and pending-Payment coordination. Migration review: no. Other review: `NguyenLeHoaiTam`, `danielnguyendbk`.
- **BKG-10 — Ticket check-in** — Dependency: BKG-05, OPS-09, ACC-03 and API-04. Expected output: locked/idempotent confirmed-to-used service. Migration review: no. Other review: `vgh203`, `NguyenLeHoaiTam`.
- **BKG-11 — Booking APIs** — Dependency: ACC-03 and BKG-03–BKG-10 plus API decisions. Expected output: approved public/authenticated endpoints, serializers and ownership/error handling. Migration review: no. Other review: `vgh203`, `NguyenLeHoaiTam`, `danielnguyendbk`.
- **BKG-12 — Booking integration/concurrency tests** — Dependency: BKG-03–BKG-11, DB-04 and stable OPS-09/10. Expected output: MySQL migration/service/API/concurrency suite. Migration review: no new migration; DDL evidence reviewed by `danielnguyendbk`. Other review: `vgh203`.

### Sprint 3

- No primary Bookings issues. `LeVuHao` is a required collaborator/reviewer for all Payment issues that consume Booking/Ticket contracts and for INT-01–INT-05.

## danielnguyendbk

### Sprint 1

- **DB-01 — Migration/database governance** — Dependency: existing Phase 1 baseline. Expected output: authoritative migration/review/reverse-evidence checklist and merge-order policy. Migration review: this defines the review gate; no application migration. Other review: all three domain owners.
- **DB-02 — Shared MySQL staging workflow** — Dependency: existing guidance, coordinated with DB-01. Expected output: secret-free staging/backup/restore/operator/smoke runbook; draft can begin in parallel. Migration review: no schema change. Other review: all three domain owners.
- **PAY-01 — SePay configuration/environment contract** — Dependency: existing environment convention and DB-01 secret policy. Expected output: validated, redacted configuration contract without credentials or Payment persistence. Migration review: no. Other review: `NguyenLeHoaiTam` for the secret/auth boundary.

### Sprint 2

- **DB-03 — Review Operations migrations** — Dependency: Operations migration evidence plus approved OQ DB-04/06/09. Expected output: recorded approve/change-request decision covering graph, DDL, reversibility and concurrency safeguards. Migration review: this is the required DB review. Other review: `vgh203`.
- **DB-04 — Review Booking migrations** — Dependency: DB-03, BKG-01/05 and approved OQ DB-01/02/05/06. Expected output: recorded approval of Booking/Ticket graph, generated/composite protections and reversibility. Migration review: this is the required DB review. Other review: `LeVuHao`, with `vgh203` for upstream FKs.
- **PAY-02 — SePay signature verification** — Dependency: PAY-01 and approved API-08 signing contract/fixtures. Expected output: pure raw-body HMAC/timestamp verifier and negative tests. Migration review: no. Other review: `NguyenLeHoaiTam` for the security boundary.
- **PAY-03 — VietQR builder** — Dependency: PAY-01 and approved QR format/encoding fixtures. Expected output: pure deterministic QR data/URL builder and golden tests. Migration review: no. Other review: `LeVuHao` for later intent output.
- **PAY-04 — SePay webhook payload parser** — Dependency: PAY-02 and approved API-08 payload fixtures. Expected output: pure authenticated-payload adapter with no DB side effects. Migration review: no. Other review: `LeVuHao`.

### Sprint 3

- **PAY-05 — Payment/PaymentTransaction model contract** — Dependency: BKG-05, DB-04, PAY-04 and DB-07/08/API-07/11 decisions. Expected output: approved persistence/state/mutability/retention contract. Migration review: DB contract review required; implementation not yet included. Other review: `LeVuHao`.
- **PAY-06 — Payment models/migrations** — Dependency: PAY-05 and DB-04. Expected output: authoritative Payment/Transaction models, reversible migrations and DDL tests. Migration review: explicitly required; `danielnguyendbk` records DB review evidence as DB Owner. Other review: `LeVuHao`.
- **INT-01 — Booking -> Payment integration** — Dependency: Booking workflows and PAY-05/06 plus approved orchestration decisions. Expected output: one-way cross-domain API, lock order and atomic confirmation/cancellation/expiry behavior. Migration review: required if DB-06 results in cross-domain triggers/migrations. Other review: required `LeVuHao`.
- **PAY-07 — Create payment intent** — Dependency: PAY-03/06, BKG-06, INT-01 and API-06/07. Expected output: one-per-Booking intent service and SePay QR response. Migration review: no. Other review: required `LeVuHao`.
- **PAY-09 — Webhook idempotency** — Dependency: PAY-04/06 and approved API-08 replay contract. Expected output: insert-first unique-ID behavior and concurrent replay tests. Migration review: required if its constraint changes PAY-06 schema. Other review: required `LeVuHao`.
- **PAY-10 — Payment matching/validation** — Dependency: PAY-04/06/07 and API-08/DB-07. Expected output: stable exact-match/review classifications. Migration review: no. Other review: required `LeVuHao`.
- **PAY-08 — SePay webhook processing** — Dependency: PAY-02/04/06/09/10, INT-01 and approved API-08/DB-07/API-11. Expected output: authenticated, atomic and idempotent webhook endpoint/orchestration. Migration review: no new migration. Other review: required `LeVuHao`; `NguyenLeHoaiTam` reviews authentication/security ordering.
- **PAY-11 — Late payment REVIEW_REQUIRED flow** — Dependency: PAY-06/10 and DB-07/API-10. Expected output: auditable late/wrong/extra classification without seat restoration. Migration review: no unless status/schema contract changes. Other review: required `LeVuHao`.
- **PAY-12 — Payment reconciliation** — Dependency: PAY-11, ACC-03 and API-10/DB-08/API-11. Expected output: Admin-only approved review actions with immutable webhook evidence. Migration review: required if mutable fields/indexes change. Other review: `NguyenLeHoaiTam`, `LeVuHao`.
- **PAY-13 — Revenue/reporting queries** — Dependency: PAY-06, BKG-05, OPS-08, ACC-03 and API-09. Expected output: approved, reproducible success-only metrics/selectors. Migration review: no unless a view/index migration is added. Other review: `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.
- **PAY-14 — Payment integration tests** — Dependency: PAY-01–PAY-13 and INT-01. Expected output: mocked-provider MySQL security/state/concurrency/reporting suite. Migration review: no new migration; DDL evidence remains under DB review. Other review: `LeVuHao`, `NguyenLeHoaiTam`.
- **INT-04 — Role/permission integration tests** — Dependency: complete domain APIs and API-01/05/09 decisions. Expected output: cross-domain session/RBAC/ownership matrix. Migration review: no. Other review: required `NguyenLeHoaiTam`; `vgh203`, `LeVuHao` review their routes.
- **INT-03 — Failure/retry scenarios** — Dependency: domain test suites, INT-01 and approved error/API-08/DB-07 behavior. Expected output: deterministic rollback/retry/race suite. Migration review: no. Other review: required `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.
- **INT-02 — Full happy-path test** — Dependency: ACC-07, OPS-07, BKG-12, PAY-14 and INT-01. Expected output: one clean-DB end-to-end automated scenario with state/report assertions. Migration review: no new migration. Other review: required `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.
- **INT-05 — Demo seed/data preparation** — Dependency: stable domains, INT-02 and API-12. Expected output: approved, non-secret, reproducible demo seed process. Migration review: explicitly required if API-12 selects a data migration. Other review: required `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.

## Workload summary

### Issue count and status by owner

| Owner | Total | READY | WAITING | BLOCKED |
|---|---:|---:|---:|---:|
| NguyenLeHoaiTam | 7 | 2 | 0 | 5 |
| vgh203 | 12 | 2 | 4 | 6 |
| LeVuHao | 12 | 1 | 2 | 9 |
| danielnguyendbk | 23 | 3 | 0 | 20 |
| **Total** | **54** | **8** | **6** | **40** |

### Difficulty by owner

| Owner | Easy | Medium | Hard | Workload interpretation |
|---|---:|---:|---:|---|
| NguyenLeHoaiTam | 0 | 4 | 3 | Substantial Sprint 1 foundation; later auth/OAuth complexity. |
| vgh203 | 2 | 3 | 7 | Largest early schema lane plus hard scheduling/concurrency work. |
| LeVuHao | 0 | 4 | 8 | Light early planning, then hard transactional/concurrency workload after Operations. |
| danielnguyendbk | 1 | 5 | 17 | Fewer early coding tasks, but dominant Sprint 3 Payment/integration/review workload. |
| **Total** | **3** | **16** | **35** | Balanced by dependency timing and complexity, not equal issue counts. |

## Ownership ambiguity

- No backlog issue has ambiguous primary ownership under the fixed prefix rule.
- `INT-*` remains owned by `danielnguyendbk` even when another domain owner is a required collaborator/reviewer.
- Schema review is not ownership transfer: domain owners author their app migrations; `danielnguyendbk` approves database impact before merge.

## Cross-domain review index

- **Accounts/RBAC consumed downstream:** ACC-03; reviewers `vgh203`, `LeVuHao`, `danielnguyendbk`.
- **Employee ↔ Operations assignment/deactivation:** ACC-06, OPS-05, OPS-11, OPS-12; reviewers `NguyenLeHoaiTam`, `vgh203`, `danielnguyendbk` as listed above.
- **Operations ↔ Bookings Trip/BusSeat/active-Ticket boundary:** OPS-04, OPS-07–OPS-09, BKG-01, BKG-03–BKG-06, BKG-10–BKG-12, DB-03/DB-04; required reviewers `vgh203`, `LeVuHao`, with DB approval by `danielnguyendbk` for schema.
- **Bookings ↔ Payments:** PAY-03–PAY-14 and INT-01; `LeVuHao` is required reviewer wherever Booking/Ticket state or schema is read/changed.
- **Authentication/security ↔ Payments:** PAY-01, PAY-02, PAY-08, PAY-12, PAY-13 and INT-04; `NguyenLeHoaiTam` reviews the applicable secret/session/RBAC boundary.
- **Reporting consumes all domains:** PAY-13; reviewers `vgh203`, `LeVuHao`, `NguyenLeHoaiTam`.
- **Final integration:** INT-02–INT-05; all three domain owners are required reviewers, with the more specific required collaborator noted in each issue.
