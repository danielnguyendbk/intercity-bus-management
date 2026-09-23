# GitHub Backlog Plan

## Planning rules

- This file is a plan only. No GitHub issue has been created or assigned.
- Django migrations are authoritative; the reference SQL must not be executed to create application tables.
- `accounts/0001_initial.py` is an approved baseline and must not be rewritten.
- `UNBLOCKED` means the issue can start immediately from the current repository baseline. `BLOCKED` means an unfinished dependency or an explicitly unresolved decision prevents safe implementation.
- Every schema PR requires Database Owner review. Only one migration-producing branch per app should be active at a time.
- Owners are fixed: Accounts — `NguyenLeHoaiTam`; Operations — `vgh203`; Bookings — `LeVuHao`; Database, Payments, Integration — Repository owner / lead.

## Accounts

### ACC-01 — Expand Custom User and Employee tests

- **Owner:** `NguyenLeHoaiTam`
- **Status:** UNBLOCKED
- **Goal:** Strengthen regression coverage for the approved `User` and `Employee` baseline without changing `accounts/0001_initial.py`.
- **Scope:** Test username/email/phone uniqueness, required email, password hashing, role isolation from Django admin flags, timestamps, employee type and driver-license validation.
- **Affected models/tables:** `accounts.User` / `users`; `accounts.Employee` / `employees`.
- **API/service impact:** None; establishes model/service expectations for later APIs.
- **Dependencies:** Existing Phase 1 accounts models and migration.
- **Unresolved business decisions:** None for this scope.
- **Required tests:** MySQL-backed model constraints where DB behavior matters; unit tests for validation and password hashing; negative tests for role escalation and invalid driver data.
- **Definition of done:** Tests cover BR-001–BR-005, BR-039, BR-048 and pass on Python 3.12/MySQL 8 without modifying the initial migration.
- **Suggested labels:** `domain:accounts`, `type:test`, `phase:1`, `status:ready`
- **Estimated difficulty:** medium

### ACC-02 — Register/login/logout APIs

- **Owner:** `NguyenLeHoaiTam`
- **Status:** BLOCKED
- **Goal:** Provide local session-based registration, login and logout flows.
- **Scope:** Register only `CUSTOMER`; validate unique identity fields; hash passwords; authenticate active users; create/end Django sessions; never expose password or accept privileged role fields.
- **Affected models/tables:** `accounts.User` / `users`; Django session tables.
- **API/service impact:** `POST /auth/register/`, `POST /auth/login/`; logout endpoint is not yet specified.
- **Dependencies:** ACC-01 is recommended; ACC-03 for consistent authorization behavior.
- **Unresolved business decisions:** The source does not define logout URL/method, CSRF response contract, or the common API error envelope. BA/Technical Lead must approve them before implementation.
- **Required tests:** Registration success/duplicates/invalid fields; password hashing; login success/failure/inactive user; session creation and logout invalidation; CSRF behavior; rejection of submitted role/staff flags.
- **Definition of done:** Approved endpoints implement session-only auth, return documented status/error shapes and pass API tests without JWT/token authentication.
- **Suggested labels:** `domain:accounts`, `type:api`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** medium

### ACC-03 — RBAC permission foundation

- **Owner:** `NguyenLeHoaiTam`
- **Status:** UNBLOCKED
- **Goal:** Provide reusable DRF permissions based on `User.role` and ownership boundaries.
- **Scope:** Implement role checks for `CUSTOMER`, `TICKET_AGENT`, `DISPATCHER`, `ADMIN`; keep `is_staff`/`is_superuser` limited to Django Admin; preserve public access hooks for search/availability.
- **Affected models/tables:** `accounts.User` / `users` (read-only).
- **API/service impact:** Shared permission classes consumed by accounts, operations, bookings and payments APIs.
- **Dependencies:** Existing custom user model and session authentication settings.
- **Unresolved business decisions:** None for the approved permission matrix; endpoint-specific detail semantics remain with their domain issues.
- **Required tests:** Allow/deny matrix for all four roles, anonymous access hooks, inactive users, and proof that Django admin flags do not grant business roles.
- **Definition of done:** Public permission API is documented, importable without downstream dependencies and covers BR-001, BR-040–BR-044 and BR-051.
- **Suggested labels:** `domain:accounts`, `type:foundation`, `security:rbac`, `status:ready`
- **Estimated difficulty:** medium

### ACC-04 — Google OAuth integration

- **Owner:** `NguyenLeHoaiTam`
- **Status:** BLOCKED
- **Goal:** Complete the approved django-allauth Google sign-in behavior using Django sessions.
- **Scope:** Configure provider integration from environment, auto-create only new-email users, force `CUSTOMER`, clear privileged flags and generate collision-safe usernames; use mocked provider flows in automated tests.
- **Affected models/tables:** `accounts.User` / `users`; allauth social-account framework tables.
- **API/service impact:** allauth-managed `/accounts/...` routes and account adapters; no custom token API.
- **Dependencies:** Existing allauth skeleton; ACC-01 test foundation is recommended.
- **Unresolved business decisions:** Verified-email and inactive-user outcomes for the full OAuth flow are explicitly not yet finalized; BA/Technical Lead must approve them. Live credentials/callback values remain separate environment-specific acceptance inputs.
- **Required tests:** New email auto-create; username collision; forced customer role; no privilege injection; invalid/inactive cases supported by the approved adapter contract; mocked callback/session creation.
- **Definition of done:** Mocked OAuth flow passes, secrets remain outside Git and no JWT/token authentication is introduced.
- **Suggested labels:** `domain:accounts`, `type:integration`, `provider:google`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### ACC-05 — Google account-linking behavior

- **Owner:** `NguyenLeHoaiTam`
- **Status:** BLOCKED
- **Goal:** Implement explicit linking when a Google email already belongs to a local account.
- **Scope:** Reject silent email linking; require authentication of the existing local account before explicit linking; prevent account takeover and duplicate social identities.
- **Affected models/tables:** `accounts.User` / `users`; allauth social-account tables.
- **API/service impact:** Authenticated link initiation/callback behavior under allauth routes.
- **Dependencies:** ACC-04.
- **Unresolved business decisions:** The source does not specify the explicit-link endpoint/UX, re-authentication method, verified-email requirement, inactive-user outcome or unlink policy. BA/Technical Lead must approve these details.
- **Required tests:** Duplicate-email rejection, unauthenticated link denial, authenticated successful link, link collision, inactive account and replay/CSRF cases after the contract is approved.
- **Definition of done:** Approved explicit-link flow is documented and tested; no provider response can silently attach to an existing user.
- **Suggested labels:** `domain:accounts`, `type:integration`, `provider:google`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### ACC-06 — Employee CRUD

- **Owner:** `NguyenLeHoaiTam`
- **Status:** BLOCKED
- **Goal:** Expose employee management while preserving driver validation and historical assignments.
- **Scope:** Admin create/update/deactivate; Dispatcher read-only; unique employee code/phone; no hard delete for referenced employees; reusable active/license validation for Operations.
- **Affected models/tables:** `accounts.Employee` / `employees`; future read of `trip_staff_assignments` for deletion/deactivation rules.
- **API/service impact:** `/employees/` collection plus not-yet-approved detail/update/deactivate routes; employee selectors/services.
- **Dependencies:** ACC-03; OPS-11 is needed to enforce history-aware deletion/deactivation fully.
- **Unresolved business decisions:** API-01 must define detail methods/routes and hard-delete policy; DB-09 must define effects of deactivating an employee already assigned to a future trip.
- **Required tests:** Role matrix; create/update validation; license rules; uniqueness; deactivate behavior; referenced-history protection once assignments exist.
- **Definition of done:** Approved CRUD surface passes API/model tests and exposes a stable validation contract for Operations.
- **Suggested labels:** `domain:accounts`, `type:api`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** medium

### ACC-07 — Accounts API tests

- **Owner:** `NguyenLeHoaiTam`
- **Status:** BLOCKED
- **Goal:** Provide end-to-end API regression coverage for local auth, RBAC, Google flows, user management and employee management.
- **Scope:** Consolidate approved accounts endpoints, sessions, permissions, ownership and error cases; Google remains mocked in CI.
- **Affected models/tables:** `users`, `employees`, Django sessions and allauth social-account tables.
- **API/service impact:** Test-only coverage of Accounts public contracts.
- **Dependencies:** ACC-02, ACC-03, ACC-04, ACC-05 and ACC-06.
- **Unresolved business decisions:** Inherits unresolved endpoint/linking decisions from ACC-02, ACC-05 and ACC-06.
- **Required tests:** Full session lifecycle; four-role matrix; user/employee CRUD; OAuth create/link cases; 400/401/403/404 behavior and secret-free fixtures.
- **Definition of done:** Accounts contract has stable automated coverage on MySQL and no test calls Google live.
- **Suggested labels:** `domain:accounts`, `type:test`, `status:blocked`
- **Estimated difficulty:** hard

## Operations

### OPS-01 — Station model and migration

- **Owner:** `vgh203`
- **Status:** UNBLOCKED
- **Goal:** Add the authoritative Django representation of stations.
- **Scope:** `Station` fields, unique station code, active flag, safe FK deletion behavior for future routes and Django-managed timestamps only if approved by the documented convention.
- **Affected models/tables:** `operations.Station` / `stations`.
- **API/service impact:** Provides the model contract for route and search work; no CRUD API in this issue.
- **Dependencies:** Existing Phase 1 baseline. DB-01 proceeds in parallel and is a mandatory review/merge gate, not a blocker to starting the model work.
- **Unresolved business decisions:** None for the initial model; API-01 remains outside this issue.
- **Required tests:** Migration from empty MySQL; unique code; field/default checks; active-state model behavior; FK deletion semantics through migration inspection.
- **Definition of done:** Model and migration match the approved data dictionary, migrate from zero and receive Database Owner review.
- **Suggested labels:** `domain:operations`, `type:schema`, `model:station`, `status:ready`
- **Estimated difficulty:** easy

### OPS-02 — Route model and validation

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Represent routes and enforce approved station, price and duration rules.
- **Scope:** Origin/destination FKs with distinct names; route code uniqueness; active/inactive status; checks for distinct stations, nonnegative price/distance and positive duration.
- **Affected models/tables:** `operations.Route` / `routes`; `stations`.
- **API/service impact:** Provides route validators/selectors used by Trip and search.
- **Dependencies:** OPS-01. DB-03 reviews the resulting Operations migration set before merge/downstream stabilization.
- **Unresolved business decisions:** None for model creation.
- **Required tests:** Origin equals destination; inactive station handling for new route/service use; numeric boundaries; unique code; FK protection; zero-to-head migration.
- **Definition of done:** Route model, migration and validation satisfy BR-006/BR-007 and pass MySQL tests.
- **Suggested labels:** `domain:operations`, `type:schema`, `model:route`, `status:blocked`
- **Estimated difficulty:** medium

### OPS-03 — Bus model

- **Owner:** `vgh203`
- **Status:** UNBLOCKED
- **Goal:** Add the authoritative Bus model without creating later-domain dependencies.
- **Scope:** License plate uniqueness, bus type/status choices and positive seat capacity; defer active-seat and active-ticket cross-checks to later service/trigger work.
- **Affected models/tables:** `operations.Bus` / `buses`.
- **API/service impact:** Provides bus contract for seats, trips and scheduling.
- **Dependencies:** Existing Phase 1 baseline. DB-01 proceeds in parallel and is a mandatory review/merge gate, not a blocker to starting the model work.
- **Unresolved business decisions:** DB-09 affects later status changes, not initial model creation.
- **Required tests:** Unique plate, capacity > 0, approved choices/defaults and clean MySQL migration.
- **Definition of done:** Bus model/migration match BR-010/BR-046 fields and pass schema tests without importing bookings.
- **Suggested labels:** `domain:operations`, `type:schema`, `model:bus`, `status:ready`
- **Estimated difficulty:** easy

### OPS-04 — BusSeat model and seat layout

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Model each bus's physical seat layout and enforce capacity/uniqueness rules.
- **Scope:** Seat type, floor/row/column, active flag, unique `(bus, seat_number)` and service/DB enforcement that active seats do not exceed capacity; active-ticket deactivation protection is deferred until Ticket exists.
- **Affected models/tables:** `operations.BusSeat` / `bus_seats`; `buses`.
- **API/service impact:** Seat-layout service contract for Operations and read contract for Bookings.
- **Dependencies:** OPS-03. DB-03 reviews the resulting Operations migration set before merge/downstream stabilization.
- **Unresolved business decisions:** None for creation/layout; BR-047 cannot be completed at DB level until BKG-05 exists.
- **Required tests:** Per-bus uniqueness, same number across buses, positive floor/layout fields, capacity boundary, concurrent seat creation where applicable and reversible migration checks.
- **Definition of done:** Layout can be created safely within capacity and the later Ticket-dependent safeguard is explicitly tracked rather than implemented early.
- **Suggested labels:** `domain:operations`, `type:schema`, `model:bus-seat`, `status:blocked`
- **Estimated difficulty:** hard

### OPS-05 — Operations services

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Centralize approved state-changing Operations rules behind service functions and transactions.
- **Scope:** Station/route/bus/seat/trip/assignment mutations, resource locking, active checks, validation ordering and stable domain exceptions; no booking/payment ownership.
- **Affected models/tables:** `stations`, `routes`, `buses`, `bus_seats`, `trips`, `trip_staff_assignments`; reads `employees`.
- **API/service impact:** Public internal service layer consumed by Operations APIs and Bookings selectors.
- **Dependencies:** OPS-01–OPS-04, OPS-08–OPS-12 and ACC-03; model-specific services may land only after their schema dependency.
- **Unresolved business decisions:** DB-06 state-enforcement depth and DB-09 deactivation effects must be decided for full completion.
- **Required tests:** Atomic mutations, validation order, domain error mapping, locks, active resource rules and absence of circular imports.
- **Definition of done:** All Operations writes used by APIs pass through tested services and unresolved rules are not guessed.
- **Suggested labels:** `domain:operations`, `type:service`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### OPS-06 — Operations CRUD APIs

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Expose approved Operations management endpoints with global Dispatcher scope.
- **Scope:** Collection and approved detail/update/deactivate actions for stations, routes, buses, seats and trips; assignment creation; serializers and role checks.
- **Affected models/tables:** All Operations models/tables; reads `employees`.
- **API/service impact:** `/stations/`, `/routes/`, `/buses/`, `/buses/{id}/seats/`, `/trips/`, `/trips/{id}/assignments/` plus only approved detail routes.
- **Dependencies:** ACC-03, OPS-05 and all relevant Operations models.
- **Unresolved business decisions:** API-01 must define detail/update/deactivate routes and methods; API-02 must define Trip transition actions.
- **Required tests:** Role matrix, validation/status codes, collection operations, approved detail actions, soft deactivation and ownership-independent global Dispatcher scope.
- **Definition of done:** Every implemented route is explicitly approved, service-backed and documented; no `/admin/` business API is introduced.
- **Suggested labels:** `domain:operations`, `type:api`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### OPS-07 — Operations tests

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Cover Operations models, services, APIs, MySQL constraints and scheduling behavior.
- **Scope:** Regression suite for station through assignment, including transitions, role access, deactivation safeguards and concurrency.
- **Affected models/tables:** All Operations tables; reads `employees` and later active `tickets` for cross-domain guards.
- **API/service impact:** Test-only validation of the Operations contract.
- **Dependencies:** OPS-01–OPS-06 and OPS-08–OPS-12; BKG-05 for active-ticket safeguards.
- **Unresolved business decisions:** Inherits API-01, API-02, DB-04, DB-06 and DB-09 until approved.
- **Required tests:** Model/constraint tests, service/API tests, MySQL migration tests, bus/staff concurrency, trip transition matrix and cross-domain guards.
- **Definition of done:** Approved Operations behavior is covered on MySQL 8 and failures are deterministic under concurrency.
- **Suggested labels:** `domain:operations`, `type:test`, `status:blocked`
- **Estimated difficulty:** hard

### OPS-08 — Trip model and migration

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Add Trip schema with route, optional draft bus, schedule, price and lifecycle state.
- **Scope:** Unique trip code, route/bus FKs, timezone-aware departure/arrival, price and status choices, time/price checks and schedule indexes; no Booking/Ticket model creation.
- **Affected models/tables:** `operations.Trip` / `trips`; `routes`, `buses`.
- **API/service impact:** Establishes the read contract required by Bookings search and creation.
- **Dependencies:** OPS-02 and OPS-03. DB-03 reviews the resulting Operations migration set before downstream stabilization.
- **Unresolved business decisions:** DB-06 affects later DB-level lifecycle enforcement, not base fields.
- **Required tests:** Arrival after departure, nonnegative price, nullable bus only for allowed service states, unique code, timezone handling and clean migration.
- **Definition of done:** Trip model/migration match the approved dictionary and expose stable FKs for Bookings.
- **Suggested labels:** `domain:operations`, `type:schema`, `model:trip`, `status:blocked`
- **Estimated difficulty:** medium

### OPS-09 — Trip lifecycle rules

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Enforce the approved Trip state machine and prerequisites for opening sales.
- **Scope:** `DRAFT -> OPEN_FOR_BOOKING -> BOARDING -> DEPARTED -> COMPLETED`, cancellation branch, route/bus/driver prerequisites and prohibition on arbitrary status writes.
- **Affected models/tables:** `trips`, `routes`, `buses`, `trip_staff_assignments`, `employees`; later reads active `tickets` for bus changes.
- **API/service impact:** Trip transition service and later explicit API actions.
- **Dependencies:** OPS-08 and OPS-11; BKG-05 for BR-045 enforcement.
- **Unresolved business decisions:** API-02 must define action endpoints and cancellation data; DB-06 must define DB trigger enforcement depth.
- **Required tests:** Valid/invalid transition matrix, open prerequisites, cancellation terminals, idempotent/invalid repeats and active-ticket bus-change denial.
- **Definition of done:** Approved service transitions are atomic, tested and not exposed through free-form status PATCH.
- **Suggested labels:** `domain:operations`, `type:service`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### OPS-10 — Bus schedule conflict validation

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Prevent overlapping active trips from using the same bus, including concurrent requests.
- **Scope:** Overlap predicate, cancelled-trip exclusion, `select_for_update()` locking, deterministic lock order, DB safeguard and domain conflict response.
- **Affected models/tables:** `trips`, `buses`.
- **API/service impact:** Trip create/reschedule/bus-assignment services; maps conflict to HTTP 409 at API boundary.
- **Dependencies:** OPS-08. DB-03 reviews the completed migration/trigger/concurrency evidence before downstream stabilization.
- **Unresolved business decisions:** DB-04 must decide whether locking plus existing trigger is sufficient or stronger DB serialization is required.
- **Required tests:** Boundary-touching schedules, cancelled trips, create/update overlap, two concurrent transactions and deadlock/error handling.
- **Definition of done:** Exactly one conflicting concurrent operation succeeds under the approved locking strategy on MySQL 8.
- **Suggested labels:** `domain:operations`, `type:concurrency`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### OPS-11 — TripStaffAssignment model/service

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Model and create staff assignments against existing Trips and Employees.
- **Scope:** Trip/employee FKs, role choices, unique `(trip, employee)`, Django-managed creation timestamp and service checks for active employee, matching type and valid driver license.
- **Affected models/tables:** `operations.TripStaffAssignment` / `trip_staff_assignments`; `trips`, `employees`.
- **API/service impact:** Assignment service used by `/trips/{id}/assignments/` and Trip open prerequisites.
- **Dependencies:** OPS-08 and existing `accounts.Employee`. DB-03 reviews the resulting Operations migration set before downstream stabilization.
- **Unresolved business decisions:** DB-09 affects later deactivation/reschedule behavior, not initial assignment creation.
- **Required tests:** Unique assignment, role/type mismatch, inactive employee, missing/expired driver license, FK protection and migration checks.
- **Definition of done:** Valid staff can be assigned only once per trip through a tested service without modifying Accounts migrations.
- **Suggested labels:** `domain:operations`, `type:schema`, `model:assignment`, `status:blocked`
- **Estimated difficulty:** medium

### OPS-12 — Staff assignment and overlap validation

- **Owner:** `vgh203`
- **Status:** BLOCKED
- **Goal:** Prevent an employee from serving overlapping active Trips, including concurrent assignments and Trip rescheduling.
- **Scope:** Overlap predicate, cancelled-trip exclusion, employee row locking, revalidation on Trip time changes, deterministic lock order and approved DB safeguard.
- **Affected models/tables:** `trip_staff_assignments`, `trips`, `employees`.
- **API/service impact:** Assignment create/update and Trip reschedule services; conflict maps to HTTP 409.
- **Dependencies:** OPS-10 and OPS-11. DB-03 reviews the completed migration/trigger/concurrency evidence afterward.
- **Unresolved business decisions:** DB-04 must approve concurrency depth; DB-09 must define behavior for already-assigned employees later deactivated.
- **Required tests:** Overlap/non-overlap boundaries, cancelled trips, expired license, concurrent assignment race and reschedule conflict.
- **Definition of done:** Approved MySQL test proves only one overlapping concurrent assignment succeeds and rescheduling cannot invalidate assignments silently.
- **Suggested labels:** `domain:operations`, `type:concurrency`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

## Bookings

### BKG-01 — Freeze Booking/Ticket model contract

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Produce a Database Owner-approved model and migration contract before Booking/Ticket implementation.
- **Scope:** Confirm fields, FKs, indexes, status choices, timestamps, deletion behavior, booking total ownership, composite booking/trip consistency and generated active-seat key strategy.
- **Affected models/tables:** Future `bookings.Booking` / `bookings`; future `bookings.Ticket` / `tickets`; references `users`, `trips`, `bus_seats`.
- **API/service impact:** Freezes identifiers and state required by every Bookings service/API and Payments FK.
- **Dependencies:** Stable contracts from OPS-04 and OPS-08; DB-01 governance.
- **Unresolved business decisions:** DB-01 composite FK, DB-02 generated field implementation, DB-05 near-departure expiry and DB-06 state-transition enforcement depth must be decided.
- **Required tests:** Contract review checklist; proposed zero/forward migration cases; DDL assertions for each approved constraint; no source implementation before approval.
- **Definition of done:** BA/Technical Lead/Database Owner record approved model and migration decisions, including reversible MySQL-specific operations.
- **Suggested labels:** `domain:bookings`, `type:design`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-02 — Define booking/search test scenarios

- **Owner:** `LeVuHao`
- **Status:** UNBLOCKED
- **Goal:** Turn approved rules into an implementation-independent scenario matrix for search, availability, booking, expiry, cancellation and check-in.
- **Scope:** Define inputs, actors, state setup, expected outputs/status codes and concurrency cases; explicitly tag scenarios that await open decisions rather than choosing answers.
- **Affected models/tables:** Planned `bookings`, `tickets`; read contracts for `users`, `stations`, `routes`, `buses`, `bus_seats`, `trips`.
- **API/service impact:** Test plan for public search/availability and authenticated booking endpoints.
- **Dependencies:** Approved BR-016–BR-023, BR-032–BR-034 and BR-041; no implementation dependency.
- **Unresolved business decisions:** Record API-03, API-04, API-05 and DB-05 as pending scenario branches; do not resolve them here.
- **Required tests:** Deliver a traceability list covering happy paths, empty results, ownership, invalid state, duplicate seat, rollback, expiry and concurrency.
- **Definition of done:** Each approved Bookings rule maps to at least one positive and one relevant negative/concurrency scenario, with TBD cases clearly separated.
- **Suggested labels:** `domain:bookings`, `type:test-design`, `phase:planning`, `status:ready`
- **Estimated difficulty:** medium

### BKG-03 — Public trip-search selector

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Return future `OPEN_FOR_BOOKING` Trips matching origin, destination and departure date, including available-seat count.
- **Scope:** Read-only selector; require assigned bus; exclude cancelled/departed/completed; sort by departure; use timezone-aware date boundaries and active-ticket occupancy.
- **Affected models/tables:** Reads `stations`, `routes`, `trips`, `buses`, `bus_seats`, `tickets`.
- **API/service impact:** Backs public `GET /search-trips/`; must not reserve a seat.
- **Dependencies:** OPS-01, OPS-02, OPS-04, OPS-08 and BKG-05.
- **Unresolved business decisions:** Exact pagination/filter/order envelope remains TBD in API contract; the documented required filters and departure ordering may proceed once dependencies exist.
- **Required tests:** Anonymous access, route/date matching, future/open/bus filters, empty result, available count and timezone boundary cases.
- **Definition of done:** Selector uses no state-changing side effects and returns only approved visible Trips with accurate snapshot counts.
- **Suggested labels:** `domain:bookings`, `type:selector`, `api:public`, `status:blocked`
- **Estimated difficulty:** medium

### BKG-04 — Seat-availability selector

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Return the active physical seats for a Trip bus with current occupancy state.
- **Scope:** Read `HELD`, `CONFIRMED`, `USED` tickets as occupied; expose available/occupied/held snapshot; reject invalid/non-open Trips according to approved visibility rules; make no reservation.
- **Affected models/tables:** Reads `trips`, `buses`, `bus_seats`, `tickets`.
- **API/service impact:** Backs public `GET /trips/{id}/seats/`.
- **Dependencies:** OPS-04, OPS-08 and BKG-05.
- **Unresolved business decisions:** Exact response envelope/pagination is not specified; BA/Technical Lead approval is required before final API serialization, while selector logic is otherwise defined.
- **Required tests:** Active/inactive seats, each ticket state, wrong/missing bus, anonymous access, stale snapshot semantics and query-count expectations.
- **Definition of done:** Selector reports approved occupancy accurately and documentation states that availability is not a hold guarantee.
- **Suggested labels:** `domain:bookings`, `type:selector`, `api:public`, `status:blocked`
- **Estimated difficulty:** medium

### BKG-05 — Booking and Ticket models/migrations

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Create authoritative Django schema for Bookings after its contract and upstream FKs stabilize.
- **Scope:** Booking/Ticket models, status choices, user/trip/seat FKs, codes, money, expiry/check-in fields, indexes and approved reversible MySQL-specific migration operations.
- **Affected models/tables:** `bookings`, `tickets`; references `users`, `trips`, `bus_seats`.
- **API/service impact:** Enables all booking services/APIs and unblocks Payment persistence.
- **Dependencies:** BKG-01, OPS-04, OPS-08 and DB-03; DB-04 reviews the resulting Booking migrations before merge.
- **Unresolved business decisions:** DB-01, DB-02, DB-05 and DB-06 block implementation until explicitly approved.
- **Required tests:** Migrate from zero/previous baseline; model state vs DDL; FK/delete behavior; status/amount checks; generated key/composite FK and reversible migration tests.
- **Definition of done:** Database Owner approves migrations; MySQL schema matches the frozen contract; no reference SQL is run manually.
- **Suggested labels:** `domain:bookings`, `type:schema`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-06 — Multi-seat booking service

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Atomically create one pending Booking and multiple held Tickets from authenticated customer/agent input.
- **Scope:** Lock/read Trip, validate open/future/bus state and every seat, derive creator/customer, generate codes, copy fare from Trip, set expiry and rollback all on any error.
- **Affected models/tables:** `bookings`, `tickets`; reads/locks `users`, `trips`, `buses`, `bus_seats`.
- **API/service impact:** Core service for `POST /bookings/`; stable domain errors for API mapping.
- **Dependencies:** BKG-05, BKG-03/BKG-04 read contracts and OPS-09 open-state behavior.
- **Unresolved business decisions:** DB-05 must define near-departure cutoff/expiry behavior.
- **Required tests:** Customer and agent ownership, multi-seat total, invalid/mixed seat rollback, server-derived fare, closed/past Trip and transaction atomicity.
- **Definition of done:** No partial Booking/Ticket data remains after failure and all approved creation rules pass on MySQL.
- **Suggested labels:** `domain:bookings`, `type:service`, `transaction:atomic`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-07 — Double-booking protection

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Guarantee that at most one active Ticket can occupy a Trip/BusSeat under real concurrency.
- **Scope:** Implement approved generated active-seat key and unique constraint, catch the identified integrity error, rollback the whole booking and return a domain conflict without choosing another seat.
- **Affected models/tables:** `tickets`, `bookings`, `trips`, `bus_seats`.
- **API/service impact:** Booking service conflict maps to HTTP 409 with the approved error envelope.
- **Dependencies:** BKG-05, BKG-06 and DB-04 migration review.
- **Unresolved business decisions:** DB-02 generated field/DDL strategy and the common API error envelope must be approved.
- **Required tests:** Two concurrent transactions for one seat; all active statuses; cancelled seat reuse; multi-seat rollback; DDL constraint name and behavior.
- **Definition of done:** MySQL concurrency test proves exactly one request succeeds and the losing transaction leaves no partial records.
- **Suggested labels:** `domain:bookings`, `type:concurrency`, `database:mysql`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-08 — Booking expiration

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Expire overdue pending Bookings and release held Tickets safely and idempotently.
- **Scope:** Small-batch management command and/or approved lazy check, row locking, pending-only transition, Ticket cancellation and a one-way service contract for later Payment cancellation.
- **Affected models/tables:** `bookings`, `tickets`; future `payments` coordination.
- **API/service impact:** Background/command service; no unapproved public endpoint.
- **Dependencies:** BKG-05, BKG-06 and INT-01 for the final Payment side effect.
- **Unresolved business decisions:** DB-05 booking cutoff and exact near-departure expiry; API contract does not approve job cadence or whether command, lazy check or both is operationally required.
- **Required tests:** Due/not-due batches, idempotent repeat, locks, held-ticket release, confirmed/cancelled immunity, expiry/webhook race after Payments exists.
- **Definition of done:** Approved execution mechanism expires only eligible rows and never reissues a seat after a competing committed payment.
- **Suggested labels:** `domain:bookings`, `type:service`, `type:background-job`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-09 — Pending booking cancellation

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Cancel an eligible pending Booking, release held Tickets and coordinate cancellation of a pending Payment.
- **Scope:** Owner/staff authorization, pre-departure/state checks, reason/time recording, locking, idempotent repeat and cross-domain notification/service contract.
- **Affected models/tables:** `bookings`, `tickets`; later `payments`; reads `users`, `trips`.
- **API/service impact:** Core service for `POST /bookings/{id}/cancel/`.
- **Dependencies:** BKG-05, ACC-03 and INT-01.
- **Unresolved business decisions:** API-05 must define Ticket Agent/Admin scope and mandatory staff cancellation reason; avoid defining a reverse `bookings -> payments` import without integration approval.
- **Required tests:** Owner vs non-owner, agent/admin matrix, before departure, pending/confirmed/expired/repeated calls, Ticket release and Payment coordination.
- **Definition of done:** Approved callers get an atomic, idempotent result; confirmed customer bookings remain non-cancellable; no circular dependency is introduced.
- **Suggested labels:** `domain:bookings`, `type:service`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-10 — Ticket check-in

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Atomically move an eligible confirmed Ticket to used and record check-in time.
- **Scope:** Ticket-code lookup, role checks, Trip state/time validation, row lock and idempotent repeat for already-used Ticket.
- **Affected models/tables:** `tickets`, `bookings`, `trips`; reads `users`.
- **API/service impact:** Service for `POST /tickets/{code}/check-in/`.
- **Dependencies:** BKG-05, OPS-09 and ACC-03.
- **Unresolved business decisions:** API-04 must define the exact “BOARDING or near departure” time window/cutoff.
- **Required tests:** Confirmed success, repeated used, held/cancelled denial, role matrix, Trip states and approved time boundaries.
- **Definition of done:** Check-in is single-write/idempotent and conforms exactly to the approved time-window rule.
- **Suggested labels:** `domain:bookings`, `type:service`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** medium

### BKG-11 — Booking APIs

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Expose public search/availability and authenticated Booking lookup/create/cancel/check-in endpoints.
- **Scope:** Serializers, validation, ownership-limited querysets, role permissions, service calls and documented 400/401/403/404/409 behavior.
- **Affected models/tables:** `bookings`, `tickets`; reads Accounts and Operations tables.
- **API/service impact:** `/search-trips/`, `/trips/{id}/seats/`, `/bookings/`, `/bookings/{code}/`, `/bookings/{id}/cancel/`, `/tickets/{code}/check-in/`.
- **Dependencies:** ACC-03 and BKG-03–BKG-10.
- **Unresolved business decisions:** API-04/API-05 and the common error envelope must be approved; exact list pagination/serialization remains TBD where applicable.
- **Required tests:** Anonymous search/availability, anonymous booking denial, customer ownership, agent/admin access, validation, transition and concurrency error mapping.
- **Definition of done:** Every endpoint uses Bookings selectors/services, applies server-side permissions and documents only approved response fields.
- **Suggested labels:** `domain:bookings`, `type:api`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### BKG-12 — Booking integration/concurrency tests

- **Owner:** `LeVuHao`
- **Status:** BLOCKED
- **Goal:** Validate the complete Bookings domain against real MySQL behavior and upstream contracts.
- **Scope:** Search through check-in, migration DDL, atomic creation, duplicate-seat races, expiration/cancellation and upstream state changes.
- **Affected models/tables:** `bookings`, `tickets` plus referenced Accounts/Operations tables; later Payment race coordination.
- **API/service impact:** End-to-end test coverage for the Bookings API/service surface.
- **Dependencies:** BKG-03–BKG-11, DB-04 and stable OPS-09/OPS-10.
- **Unresolved business decisions:** Inherits DB-05, API-04/API-05 and approved error envelope until resolved.
- **Required tests:** MySQL-only constraint/locking tests, two-client seat race, expiry/payment race, permissions, rollback and zero-to-head migration.
- **Definition of done:** All approved Bookings scenarios from BKG-02 pass deterministically on MySQL 8; unsupported/TBD scenarios remain explicitly excluded.
- **Suggested labels:** `domain:bookings`, `type:test`, `type:concurrency`, `status:blocked`
- **Estimated difficulty:** hard

## Database

### DB-01 — Migration/database governance

- **Owner:** Repository owner / lead
- **Status:** UNBLOCKED
- **Goal:** Establish the enforceable workflow for authoritative, reviewable and reversible Django migrations.
- **Scope:** Migration naming/dependencies, single migration owner per app, Database Owner approval, zero/forward testing, reversible MySQL `RunSQL`, DDL inspection and prohibition on running reference SQL.
- **Affected models/tables:** All current and future application/framework tables, triggers and views.
- **API/service impact:** None directly; gates every schema-changing issue.
- **Dependencies:** Existing Phase 1 migration baseline.
- **Unresolved business decisions:** This issue records process only and must not decide DB-01–DB-09 technical/business questions silently.
- **Required tests:** Document required `migrate`, `showmigrations`, `sqlmigrate`/DDL inspection and reverse rehearsal checks for schema PRs.
- **Definition of done:** A reviewed checklist defines author, reviewer, merge order, rollback evidence and shared-database prohibition for feature branches.
- **Suggested labels:** `domain:database`, `type:governance`, `priority:critical`, `status:ready`
- **Estimated difficulty:** medium

### DB-02 — Shared MySQL staging workflow

- **Owner:** Repository owner / lead
- **Status:** UNBLOCKED
- **Goal:** Define a safe staging migration and verification runbook distinct from local development.
- **Scope:** Isolated local databases, integration-branch-only staging migration, backups, one designated operator, secret handling, restore plan, schema/trigger/view verification and smoke checks.
- **Affected models/tables:** Entire shared MySQL staging schema.
- **API/service impact:** Defines post-migration smoke validation, not application behavior.
- **Dependencies:** Existing repository/staging guidance; coordinate with DB-01, but the secret-free runbook can be drafted in parallel.
- **Unresolved business decisions:** Actual staging host/credentials and deployment operator are external configuration inputs; the workflow can be documented without committing them.
- **Required tests:** Dry-run checklist on a disposable database; restore rehearsal definition; evidence template separating local tests from staging/live acceptance.
- **Definition of done:** Team has a copy-pasteable, secret-free runbook and no developer is instructed to edit staging schema manually.
- **Suggested labels:** `domain:database`, `type:devops`, `environment:staging`, `status:ready`
- **Estimated difficulty:** medium

### DB-03 — Review Operations migrations

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Review Operations schema, migration order, constraints, triggers and reversibility before merge.
- **Scope:** Station→Route and Bus→BusSeat→Trip→Assignment graph; names/types/FKs/indexes/checks; overlap/capacity safeguards; zero/forward/reverse DDL evidence.
- **Affected models/tables:** `stations`, `routes`, `buses`, `bus_seats`, `trips`, `trip_staff_assignments` and Operations triggers.
- **API/service impact:** Confirms schema contracts consumed by Bookings.
- **Dependencies:** OPS-01–OPS-04, OPS-08, OPS-10–OPS-12; DB-01.
- **Unresolved business decisions:** DB-04 concurrency depth, DB-06 enforcement depth and DB-09 deactivation effects must be approved where migrations encode them.
- **Required tests:** Empty database migration, forward from baseline, reverse operations, `SHOW CREATE TABLE`, trigger behavior and migration graph consistency.
- **Definition of done:** Database Owner records approval or concrete change requests; no competing Operations migrations remain.
- **Suggested labels:** `domain:database`, `review:migration`, `domain:operations`, `status:blocked`
- **Estimated difficulty:** hard

### DB-04 — Review Booking migrations

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Review Booking/Ticket schema and MySQL-specific protections before Payment schema begins.
- **Scope:** FK graph, composite booking/trip consistency, generated active-seat key, unique/index/check names, total/expiry/state safeguards, reversibility and view ownership.
- **Affected models/tables:** `bookings`, `tickets`, future `v_trip_availability`; references Accounts/Operations tables.
- **API/service impact:** Freezes persistence contracts for booking services and Payment FK.
- **Dependencies:** BKG-01, BKG-05 and DB-03.
- **Unresolved business decisions:** DB-01, DB-02, DB-05 and DB-06 must be explicitly resolved before approval.
- **Required tests:** Zero/forward/reverse migration; model-state/DDL match; composite FK; generated key; duplicate-seat race; trigger/view existence and behavior.
- **Definition of done:** Database Owner approves migration graph and evidence; Payment persistence is formally unblocked.
- **Suggested labels:** `domain:database`, `review:migration`, `domain:bookings`, `priority:critical`, `status:blocked`
- **Estimated difficulty:** hard

## Payments

### PAY-01 — SePay configuration/environment contract

- **Owner:** Repository owner / lead
- **Status:** UNBLOCKED
- **Goal:** Freeze secret-free configuration names and validation boundaries for SePay/VietQR.
- **Scope:** Document `SEPAY_WEBHOOK_SECRET`, bank/account/name and webhook age variables; startup validation; local/test placeholders; redacted logging; environment-specific callback/HTTPS notes.
- **Affected models/tables:** None.
- **API/service impact:** Configuration input for verifier, QR builder and webhook; no persistence.
- **Dependencies:** Existing `.env.example` convention; coordinate secret-handling language with DB-01 in parallel.
- **Unresolved business decisions:** API-08 still controls actual header/timestamp/signing details; this issue must leave those fields marked pending rather than guess.
- **Required tests:** Missing/invalid configuration unit tests without real secrets; test settings fixture; assertion that logs/errors do not disclose secret/account values.
- **Definition of done:** Approved environment names and validation behavior are documented and safely testable; no credential is committed.
- **Suggested labels:** `domain:payments`, `type:configuration`, `security:secrets`, `status:ready`
- **Estimated difficulty:** easy

### PAY-02 — SePay signature verification

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Build a pure verifier for SePay raw-body HMAC and timestamp freshness before JSON/business processing.
- **Scope:** Consume raw bytes and approved headers; constant-time signature comparison; timestamp parsing/freshness; no DB access and no payload persistence before authenticity succeeds.
- **Affected models/tables:** None.
- **API/service impact:** Security gate for `POST /webhooks/sepay/`.
- **Dependencies:** PAY-01.
- **Unresolved business decisions:** API-08 must supply verified header names, signing input/encoding, timestamp unit/window and valid/invalid fixtures from the actual SePay integration.
- **Required tests:** Official valid fixture, altered body/signature, missing/malformed headers, stale/future timestamp and proof parser/service is not called on failure.
- **Definition of done:** Pure deterministic verifier passes approved fixtures, performs no I/O and never logs the secret/signature payload unsafely.
- **Suggested labels:** `domain:payments`, `type:security`, `provider:sepay`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-03 — VietQR builder

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Build a pure VietQR representation from approved bank/account/amount/payment-code inputs.
- **Scope:** Validate required configuration and monetary input; generate only the approved URL/data form; keep network and database access outside the builder.
- **Affected models/tables:** None.
- **API/service impact:** Pure component used by payment-intent response.
- **Dependencies:** PAY-01.
- **Unresolved business decisions:** The repository does not freeze the exact QR provider format, encoding, returned URL/data fields or account-name normalization. Payment Owner/Technical Lead must approve these from the actual integration.
- **Required tests:** Approved golden fixtures, encoding of payment code/account name, exact amount, invalid/missing input and no-secret output/logging checks.
- **Definition of done:** Builder is deterministic and matches approved VietQR fixtures without DB/network calls.
- **Suggested labels:** `domain:payments`, `type:pure-component`, `provider:vietqr`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** medium

### PAY-04 — SePay webhook payload parser

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Normalize an authenticated SePay payload into a typed internal command without business side effects.
- **Scope:** Parse only after PAY-02 succeeds; validate identifiers, transaction time, account, direction, amount, reference, content and optional fields; retain authenticated raw payload for later persistence.
- **Affected models/tables:** None yet; future mapping to `payment_transactions`.
- **API/service impact:** Pure adapter between webhook boundary and payment service.
- **Dependencies:** PAY-02.
- **Unresolved business decisions:** API-08 must provide confirmed payload field names/types, payment-code extraction/case rules, response/retry behavior and fixtures.
- **Required tests:** Approved full/minimal fixtures, missing/wrong types, inbound/outbound values, amount/time conversion and proof unauthenticated payloads never reach parser.
- **Definition of done:** Parser produces one documented internal shape from approved fixtures and performs no DB mutations.
- **Suggested labels:** `domain:payments`, `type:pure-component`, `provider:sepay`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** medium

### PAY-05 — Payment/PaymentTransaction model contract

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Freeze Payment persistence only after Booking exists and review/reconciliation semantics are approved.
- **Scope:** Confirm one-to-one Booking relation, codes, amount/method/status, transaction fields/indexes, raw JSON, mutable audit fields, timestamps, checks and transition responsibilities.
- **Affected models/tables:** Future `payments.Payment` / `payments`; `payments.PaymentTransaction` / `payment_transactions`; references `bookings`.
- **API/service impact:** Persistence contract for all Payment services, webhook, status and reporting.
- **Dependencies:** BKG-05 and DB-04; PAY-04 internal payload shape.
- **Unresolved business decisions:** DB-07 review-state mapping, DB-08 transaction mutability, API-07 CASH creation and API-11 retention/masking/access must be decided.
- **Required tests:** Contract/DDL review matrix, state/method/amount checks, unique identifiers, FK/delete semantics, JSON/timestamp mapping and mutability assertions.
- **Definition of done:** Payment Owner/Technical Lead/Database Owner approve a versioned contract; no Payment model is created before Booking.
- **Suggested labels:** `domain:payments`, `type:design`, `needs:decision`, `priority:critical`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-06 — Payment models/migrations

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Implement authoritative Payment and PaymentTransaction schema after Booking migration approval.
- **Scope:** Models, FKs, choices, constraints, indexes, timestamps and approved reversible triggers/view; no manual reference SQL.
- **Affected models/tables:** `payments`, `payment_transactions`, future `v_booking_summary`; references `bookings`/`tickets`.
- **API/service impact:** Enables payment intent, webhook, reconciliation and reporting services.
- **Dependencies:** PAY-05 and DB-04.
- **Unresolved business decisions:** Inherits DB-07, DB-08, API-07 and API-11 until the contract is frozen.
- **Required tests:** Zero/forward/reverse migration, model-state/DDL comparison, one-payment-per-booking, unique SePay ID, amount/status constraints and trigger/view behavior.
- **Definition of done:** Database Owner approves the migration graph and a clean MySQL database reaches head successfully.
- **Suggested labels:** `domain:payments`, `type:schema`, `database:mysql`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-07 — Create payment intent

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Create or return an approved Payment intent for an eligible pending Booking and produce SePay QR details when applicable.
- **Scope:** Lock Booking, validate pending/not expired/held tickets/positive total, derive amount, generate unique payment code, enforce one intent and call PAY-03 for SePay.
- **Affected models/tables:** `payments`; reads/locks `bookings`, `tickets`.
- **API/service impact:** Service for `POST /payments/sepay/`; later CASH flow according to approved contract.
- **Dependencies:** PAY-03, PAY-06, BKG-06 and INT-01.
- **Unresolved business decisions:** API-06 repeated-intent behavior and API-07 CASH creation lifecycle must be approved.
- **Required tests:** Eligible/ineligible Booking, expiry, amount derivation, unique code, repeated requests, concurrent creation and QR output.
- **Definition of done:** Exactly one intent exists per Booking and repeated/concurrent calls follow the approved deterministic behavior.
- **Suggested labels:** `domain:payments`, `type:service`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-08 — SePay webhook processing

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Implement the authenticated webhook boundary and atomic orchestration for SePay transactions.
- **Scope:** Raw-body verification before parsing, idempotency entry, matching, row locks, classification, success transition and HTTP response; no manual SePay-success endpoint.
- **Affected models/tables:** `payment_transactions`, `payments`, `bookings`, `tickets`.
- **API/service impact:** `POST /webhooks/sepay/` and internal confirmation orchestration.
- **Dependencies:** PAY-02, PAY-04, PAY-06, PAY-09, PAY-10 and INT-01.
- **Unresolved business decisions:** API-08 response/retry contract, DB-07 review mapping and API-11 raw-payload handling must be approved.
- **Required tests:** Auth failure before parse/DB, valid success, every review classification, duplicate replay, atomic rollback and exact HTTP response behavior.
- **Definition of done:** Verified on-time transactions transition Payment/Booking/Tickets once; invalid authenticity causes no persistence; replay returns approved HTTP 200 behavior.
- **Suggested labels:** `domain:payments`, `type:webhook`, `provider:sepay`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-09 — Webhook idempotency

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Guarantee one business effect for each `sepay_transaction_id`, including concurrent retries.
- **Scope:** Unique DB key, insert-first transaction flow, duplicate lookup/return, stable previous result and no repeated confirmation.
- **Affected models/tables:** `payment_transactions`; reads related `payments`, `bookings`, `tickets`.
- **API/service impact:** Idempotency component of the webhook; valid replay returns approved success response.
- **Dependencies:** PAY-06 and PAY-04; exact response finalized by API-08 decision.
- **Unresolved business decisions:** API-08 must confirm replay response body; DB uniqueness behavior is otherwise approved by BR-027.
- **Required tests:** Sequential duplicate, concurrent duplicate, same ID/different payload conflict policy once approved, rollback/retry and single downstream transition.
- **Definition of done:** MySQL concurrency test proves one transaction record/business transition for duplicate SePay ID.
- **Suggested labels:** `domain:payments`, `type:concurrency`, `provider:sepay`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-10 — Payment matching/validation

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Classify authenticated inbound transactions against Payment/Booking data without unsafe confirmation.
- **Scope:** Payment-code extraction, inbound transfer, destination account, exact amount, Booking status/expiry, duplicates/extras and stable reason codes.
- **Affected models/tables:** Reads/locks `payments`, `payment_transactions`, `bookings`, `tickets`.
- **API/service impact:** Pure/service classification used by webhook and reconciliation.
- **Dependencies:** PAY-04, PAY-06 and PAY-07.
- **Unresolved business decisions:** API-08 extraction/case rules and DB-07 mapping of each mismatch to transaction-only vs Payment `REVIEW_REQUIRED` must be approved.
- **Required tests:** Match success; unmatched/wrong code/account/amount/direction; late, extra and already-success cases using approved fixtures.
- **Definition of done:** Only exact, approved on-time matches can request confirmation; all other cases receive approved stable classifications.
- **Suggested labels:** `domain:payments`, `type:service`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-11 — Late payment REVIEW_REQUIRED flow

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Preserve late/wrong/extra authenticated transfers for review without restoring seats or confirming Booking.
- **Scope:** Classification persistence, review reason, immutable transaction evidence, no automatic seat regrant and safe status exposure to Admin.
- **Affected models/tables:** `payment_transactions`, possibly `payments` according to approved mapping; reads `bookings`, `tickets`.
- **API/service impact:** Webhook review branch and later admin review selectors.
- **Dependencies:** PAY-06 and PAY-10.
- **Unresolved business decisions:** DB-07 exact status matrix and API-10 allowed admin review actions must be approved.
- **Required tests:** Late expired/cancelled Booking, wrong/extra amount, unmatched transfer, no Booking/Ticket transition and revenue exclusion.
- **Definition of done:** Every approved problem case is auditable and never confirms or reissues seats automatically.
- **Suggested labels:** `domain:payments`, `type:service`, `workflow:review`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-12 — Payment reconciliation

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Provide Admin-only review/reconciliation without bypassing verified webhook boundaries.
- **Scope:** Review queue selectors and only approved manual match/ignore/escalate actions; capture audit fields; never expose manual SePay success.
- **Affected models/tables:** `payment_transactions`, `payments`; reads `bookings`, `tickets`, `users`.
- **API/service impact:** Future `/api/payments/transactions/` query/action surface.
- **Dependencies:** PAY-11 and ACC-03.
- **Unresolved business decisions:** API-10 valid actions/audit data, DB-08 mutable fields and API-11 access/masking/retention must be approved.
- **Required tests:** Admin-only access, allowed/forbidden transitions, immutable webhook evidence, no confirmation bypass and audit updates.
- **Definition of done:** Reconciliation implements only approved actions and cannot invoke SePay success without the authenticated webhook path.
- **Suggested labels:** `domain:payments`, `type:api`, `workflow:reconciliation`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-13 — Revenue/reporting queries

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Produce explainable dashboard metrics from approved date and revenue definitions.
- **Scope:** Revenue from successful Payments only, Trip counts, sold/used Tickets, utilization and top route/trip; zero/empty output; Dispatcher/Admin visibility.
- **Affected models/tables:** Reads `payments`, `payment_transactions`, `bookings`, `tickets`, `trips`, `routes`, `bus_seats`.
- **API/service impact:** Reporting selectors and future `GET /dashboard/`.
- **Dependencies:** PAY-06, BKG-05, OPS-08 and ACC-03.
- **Unresolved business decisions:** API-09 must define inclusive/exclusive dates, source date per metric, sold-ticket/utilization formulas, ranking basis and Dispatcher/Admin metric differences.
- **Required tests:** Approved boundary dates/timezone, success-only revenue, review exclusion, zero data and DB-query reconciliation fixtures.
- **Definition of done:** Each metric has an approved formula and can be reproduced with a direct read query on test data.
- **Suggested labels:** `domain:payments`, `type:reporting`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** hard

### PAY-14 — Payment integration tests

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Validate Payment, SePay, QR, reconciliation and reporting behavior on MySQL with external providers mocked.
- **Scope:** Configuration through API/webhook/reporting, persistence/migrations, roles, security ordering, state transitions and concurrency; separate live HTTPS acceptance.
- **Affected models/tables:** `payments`, `payment_transactions`, `bookings`, `tickets` and reporting reads.
- **API/service impact:** Full automated coverage for Payments endpoints/services.
- **Dependencies:** PAY-01–PAY-13 and INT-01.
- **Unresolved business decisions:** Inherits API-06–API-11 and DB-07/DB-08 until resolved.
- **Required tests:** QR fixtures; signature/timestamp; malformed payload; all matching classes; duplicate concurrency; cash vs SePay permissions; reconciliation; reporting; zero-to-head migration.
- **Definition of done:** Mock/integration suite passes deterministically; documentation states that it does not prove live SePay/HTTPS acceptance.
- **Suggested labels:** `domain:payments`, `type:test`, `provider:sepay`, `status:blocked`
- **Estimated difficulty:** hard

## Integration

### INT-01 — Booking -> Payment integration

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Define and implement one-way orchestration between Bookings and Payments without circular imports.
- **Scope:** Payment success confirms Booking/Tickets in one transaction; Booking expiry/cancellation cancels pending Payment through an approved service/event boundary; establish lock order.
- **Affected models/tables:** `bookings`, `tickets`, `payments`, `payment_transactions`.
- **API/service impact:** Internal contracts used by booking cancellation/expiry, payment intent and webhook confirmation.
- **Dependencies:** BKG-05/BKG-06/BKG-08/BKG-09 and PAY-05/PAY-06.
- **Unresolved business decisions:** DB-06 enforcement depth, API-07 CASH lifecycle and the exact orchestration mechanism must be approved by both domain owners to avoid reverse imports.
- **Required tests:** Success atomicity, cancellation/expiry propagation, rollback, lock order, no circular import and expiry/webhook race.
- **Definition of done:** Cross-domain transitions are atomic, have one documented owner/call direction and cannot bypass SePay verification.
- **Suggested labels:** `domain:integration`, `type:architecture`, `priority:critical`, `status:blocked`
- **Estimated difficulty:** hard

### INT-02 — Full happy-path test

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Validate the approved end-to-end demo from account/master data through check-in and reporting.
- **Scope:** Admin/Dispatcher setup, Trip open, public search/availability, customer booking, SePay intent, mocked verified webhook, confirmation, second-customer occupancy, check-in and revenue.
- **Affected models/tables:** All 12 business tables plus Django session/allauth tables.
- **API/service impact:** Full public/business API path; SePay external call remains mocked unless separately performing live acceptance.
- **Dependencies:** ACC-07, OPS-07, BKG-12, PAY-14 and INT-01.
- **Unresolved business decisions:** All decisions required by those domain issues must be resolved; live SePay is explicitly separate.
- **Required tests:** One deterministic API-level happy path with state/DB assertions after every transition and final report reconciliation.
- **Definition of done:** A clean MySQL database can run the full automated scenario and produce the expected final states/metrics.
- **Suggested labels:** `domain:integration`, `type:e2e-test`, `priority:critical`, `status:blocked`
- **Estimated difficulty:** hard

### INT-03 — Failure/retry scenarios

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Validate cross-domain failure handling, retries and race outcomes without corrupting state.
- **Scope:** Seat conflict, bus/staff conflict, partial booking rollback, invalid/stale webhook, duplicate webhook, wrong/late payment, cancellation/expiry races and DB failure rollback.
- **Affected models/tables:** All Operations, Bookings and Payments tables involved in each scenario.
- **API/service impact:** Verifies 400/401/403/404/409/200 contracts and idempotent retry semantics.
- **Dependencies:** OPS-07, BKG-12, PAY-14 and INT-01.
- **Unresolved business decisions:** Requires approved common error envelope, API-08 retry response and DB-07 review mapping.
- **Required tests:** Deterministic MySQL concurrency tests, transaction rollback assertions, replay assertions and no orphan/half-transition records.
- **Definition of done:** Every approved failure path preserves invariants and retry behavior matches the frozen API contract.
- **Suggested labels:** `domain:integration`, `type:failure-test`, `type:concurrency`, `status:blocked`
- **Estimated difficulty:** hard

### INT-04 — Role/permission integration tests

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Validate the four-role matrix across domain boundaries with session authentication.
- **Scope:** Anonymous, Customer, Ticket Agent, Dispatcher and Admin access/ownership; Django Admin isolation; no privilege from `is_staff` alone; no manual SePay success.
- **Affected models/tables:** `users` plus resources queried/mutated by every API domain.
- **API/service impact:** Cross-API authorization test suite.
- **Dependencies:** ACC-03/ACC-07, OPS-06, BKG-11, PAY-08/PAY-12/PAY-13.
- **Unresolved business decisions:** API-01 detail routes, API-05 staff cancellation scope and API-09 Dispatcher/Admin report differences must be approved.
- **Required tests:** Allow/deny matrix per endpoint, ownership 403/404 behavior, inactive users, `/admin/` boundary and provider-webhook authentication separation.
- **Definition of done:** Every approved endpoint has positive and negative role/ownership coverage with sessions only.
- **Suggested labels:** `domain:integration`, `type:permission-test`, `security:rbac`, `status:blocked`
- **Estimated difficulty:** hard

### INT-05 — Demo seed/data preparation

- **Owner:** Repository owner / lead
- **Status:** BLOCKED
- **Goal:** Provide reproducible, non-secret demo data for the final scenario without bypassing Django schema/password handling.
- **Scope:** Approved seed mechanism for roles/users, employees, stations, route, bus/seats and Trip; later Booking/Payment data should be created through services where appropriate.
- **Affected models/tables:** Potentially all 12 business tables; framework user/session data as needed.
- **API/service impact:** Supports demo and test setup; not a production endpoint.
- **Dependencies:** Stable migrations for Accounts, Operations, Bookings and Payments; INT-02 scenario definition.
- **Unresolved business decisions:** API-12 must choose management command, fixture or data migration and identify environments where seeding is allowed.
- **Required tests:** Idempotent/repeat behavior as approved, password hashing, FK validity, no credentials/real webhook payloads and clean-database setup.
- **Definition of done:** One approved command/process produces the documented demo baseline on a disposable database and is blocked from unsafe environments as required.
- **Suggested labels:** `domain:integration`, `type:demo-data`, `needs:decision`, `status:blocked`
- **Estimated difficulty:** medium

## Backlog totals

- **Total planned issues:** 54
- **Immediately actionable (`UNBLOCKED`):** 8
- **Blocked:** 46
