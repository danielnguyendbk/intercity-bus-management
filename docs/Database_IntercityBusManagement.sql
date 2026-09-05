-- ============================================================================
-- INTERCITY BUS MANAGEMENT SYSTEM - MYSQL 8.0+
-- Scope: 12 business tables for the Python/Django group project with real SePay payment.
-- Database name: intercity_bus_management
--
-- IMPORTANT:
--   * This initialization script is intended for development/demo environments.
--   * It drops and recreates the 12 business tables in this database.
--   * Django may create additional framework tables (migrations, sessions, etc.);
--     those tables are not counted in the 12 business tables below.
--   * Store passwords only as Django-compatible hashes. Never store plaintext.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS intercity_bus_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE intercity_bus_management;
SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- --------------------------------------------------------------------------
-- RESET DEVELOPMENT SCHEMA
-- --------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_booking_summary;
DROP VIEW IF EXISTS v_trip_availability;

DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS trip_staff_assignments;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS bus_seats;
DROP TABLE IF EXISTS buses;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. USERS
-- Login roles: CUSTOMER, TICKET_AGENT, DISPATCHER, ADMIN
-- ============================================================================
CREATE TABLE users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    username        VARCHAR(150) NOT NULL,
    password        VARCHAR(128) NOT NULL,

    first_name      VARCHAR(150) NOT NULL DEFAULT '',
    last_name       VARCHAR(150) NOT NULL DEFAULT '',

    email           VARCHAR(254) NOT NULL,
    phone           VARCHAR(20) NULL,

    role            VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_staff        BOOLEAN NOT NULL DEFAULT FALSE,
    is_superuser    BOOLEAN NOT NULL DEFAULT FALSE,

    last_login      DATETIME NULL,
    date_joined     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at      DATETIME NOT NULL
                    DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT uq_users_username
        UNIQUE (username),

    CONSTRAINT uq_users_email
        UNIQUE (email),

    CONSTRAINT uq_users_phone
        UNIQUE (phone),

    CONSTRAINT chk_users_role
        CHECK (
            role IN (
                'CUSTOMER',
                'TICKET_AGENT',
                'DISPATCHER',
                'ADMIN'
            )
        )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 2. EMPLOYEES
-- DRIVER and BUS_ATTENDANT are operational employee types, not login roles.
-- ============================================================================
CREATE TABLE employees (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_code       VARCHAR(20) NOT NULL,
    full_name           VARCHAR(120) NOT NULL,
    phone               VARCHAR(20) NOT NULL,
    employee_type       ENUM('DRIVER','BUS_ATTENDANT') NOT NULL,
    license_number      VARCHAR(50) NULL,
    license_class       VARCHAR(20) NULL,
    license_expiry      DATE NULL,
    hire_date           DATE NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_employees_code UNIQUE (employee_code),
    CONSTRAINT uq_employees_phone UNIQUE (phone),
    CONSTRAINT chk_driver_license CHECK (
        employee_type <> 'DRIVER'
        OR (license_number IS NOT NULL AND license_expiry IS NOT NULL)
    )
) ENGINE=InnoDB;

-- ============================================================================
-- 3. STATIONS
-- Origin/destination terminals or stations.
-- ============================================================================
CREATE TABLE stations (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    station_code        VARCHAR(20) NOT NULL,
    name                VARCHAR(150) NOT NULL,
    province_city       VARCHAR(100) NOT NULL,
    address             VARCHAR(255) NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_stations_code UNIQUE (station_code)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. ROUTES
-- MVP route = one origin station + one destination station.
-- Intermediate route stops are intentionally out of scope.
-- ============================================================================
CREATE TABLE routes (
    id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    route_code                  VARCHAR(20) NOT NULL,
    route_name                  VARCHAR(160) NOT NULL,
    origin_station_id           BIGINT UNSIGNED NOT NULL,
    destination_station_id      BIGINT UNSIGNED NOT NULL,
    distance_km                 DECIMAL(8,2) NULL,
    estimated_duration_minutes  INT UNSIGNED NULL,
    base_price                  DECIMAL(12,2) NOT NULL,
    status                      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_routes_code UNIQUE (route_code),
    CONSTRAINT fk_routes_origin_station
        FOREIGN KEY (origin_station_id) REFERENCES stations(id)
         ON DELETE RESTRICT,
    CONSTRAINT fk_routes_destination_station
        FOREIGN KEY (destination_station_id) REFERENCES stations(id)
		ON DELETE RESTRICT,
    CONSTRAINT chk_routes_different_stations
        CHECK (origin_station_id <> destination_station_id),
    CONSTRAINT chk_routes_base_price CHECK (base_price >= 0),
    CONSTRAINT chk_routes_distance CHECK (distance_km IS NULL OR distance_km > 0),
    CONSTRAINT chk_routes_duration CHECK (
        estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0
    )
) ENGINE=InnoDB;

CREATE INDEX idx_routes_origin_destination
    ON routes(origin_station_id, destination_station_id, status);

-- ============================================================================
-- 5. BUSES
-- ============================================================================
CREATE TABLE buses (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    license_plate       VARCHAR(20) NOT NULL,
    bus_name            VARCHAR(100) NULL,
    bus_type            ENUM('SEATER','SLEEPER','LIMOUSINE') NOT NULL,
    seat_capacity       SMALLINT UNSIGNED NOT NULL,
    status              ENUM('ACTIVE','MAINTENANCE','INACTIVE')
                        NOT NULL DEFAULT 'ACTIVE',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_buses_license_plate UNIQUE (license_plate),
    CONSTRAINT chk_buses_capacity CHECK (seat_capacity > 0)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. BUS_SEATS
-- Seat layout belongs to a bus. A seat number must be unique within one bus.
-- ============================================================================
CREATE TABLE bus_seats (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bus_id              BIGINT UNSIGNED NOT NULL,
    seat_number         VARCHAR(10) NOT NULL,
    seat_type           ENUM('STANDARD','VIP') NOT NULL DEFAULT 'STANDARD',
    floor_number        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    seat_row                 SMALLINT UNSIGNED NULL,
    column_number       SMALLINT UNSIGNED NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_bus_seat_number UNIQUE (bus_id, seat_number),
    CONSTRAINT fk_bus_seats_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
         ON DELETE CASCADE,
    CONSTRAINT chk_bus_seats_floor CHECK (floor_number >= 1)
) ENGINE=InnoDB;

CREATE INDEX idx_bus_seats_bus_active ON bus_seats(bus_id, is_active);

-- ============================================================================
-- 7. TRIPS
-- A concrete departure generated from a route.
-- bus_id may be NULL while the trip is still DRAFT.
-- ============================================================================
CREATE TABLE trips (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    trip_code           VARCHAR(30) NOT NULL,
    route_id            BIGINT UNSIGNED NOT NULL,
    bus_id              BIGINT UNSIGNED NULL,
    departure_time      DATETIME NOT NULL,
    arrival_time        DATETIME NOT NULL,
    ticket_price        DECIMAL(12,2) NOT NULL,
    status              ENUM(
                            'DRAFT',
                            'OPEN_FOR_BOOKING',
                            'BOARDING',
                            'DEPARTED',
                            'COMPLETED',
                            'CANCELLED'
                        ) NOT NULL DEFAULT 'DRAFT',
    notes               VARCHAR(500) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_trips_code UNIQUE (trip_code),
    CONSTRAINT fk_trips_route
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_trips_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_trips_time CHECK (arrival_time > departure_time),
    CONSTRAINT chk_trips_price CHECK (ticket_price >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_trips_search
    ON trips(route_id, departure_time, status);
CREATE INDEX idx_trips_bus_schedule
    ON trips(bus_id, departure_time, arrival_time, status);

-- ============================================================================
-- 8. TRIP_STAFF_ASSIGNMENTS
-- Assigns DRIVER or BUS_ATTENDANT to a trip.
-- ============================================================================
CREATE TABLE trip_staff_assignments (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    trip_id             BIGINT UNSIGNED NOT NULL,
    employee_id         BIGINT UNSIGNED NOT NULL,
    assignment_role     ENUM('DRIVER','BUS_ATTENDANT') NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_trip_employee UNIQUE (trip_id, employee_id),
    CONSTRAINT fk_trip_staff_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
         ON DELETE CASCADE,
    CONSTRAINT fk_trip_staff_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
         ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE INDEX idx_trip_staff_employee ON trip_staff_assignments(employee_id, trip_id);

-- ============================================================================
-- 9. BOOKINGS
-- One booking belongs to exactly one trip and can contain multiple tickets.
-- customer_user_id may be NULL for a walk-in customer booked by TICKET_AGENT.
-- created_by_user_id records who created the booking.
-- Real payment flow: PENDING bookings have an expiry time. When EXPIRED,
-- HELD tickets are released and a late SePay transfer must be reviewed manually.
-- ============================================================================
CREATE TABLE bookings (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_code        VARCHAR(30) NOT NULL,
    trip_id             BIGINT UNSIGNED NOT NULL,
    customer_user_id    BIGINT UNSIGNED NULL,
    created_by_user_id  BIGINT UNSIGNED NULL,
    contact_name        VARCHAR(120) NOT NULL,
    contact_phone       VARCHAR(20) NOT NULL,
    contact_email       VARCHAR(255) NULL,
    total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    expires_at          DATETIME NULL,
    booking_status      ENUM('PENDING','CONFIRMED','EXPIRED','CANCELLED','COMPLETED')
                        NOT NULL DEFAULT 'PENDING',
    cancelled_at        DATETIME NULL,
    cancellation_reason VARCHAR(255) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_bookings_code UNIQUE (booking_code),
    CONSTRAINT uq_bookings_id_trip UNIQUE (id, trip_id),
    CONSTRAINT fk_bookings_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
         ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_customer
        FOREIGN KEY (customer_user_id) REFERENCES users(id)
         ON DELETE SET NULL,
    CONSTRAINT fk_bookings_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users(id)
         ON DELETE SET NULL,
    CONSTRAINT chk_bookings_total CHECK (total_amount >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_bookings_customer_created
    ON bookings(customer_user_id, created_at);
CREATE INDEX idx_bookings_trip_status
    ON bookings(trip_id, booking_status);
CREATE INDEX idx_bookings_expiry
    ON bookings(booking_status, expires_at);

-- ============================================================================
-- 10. TICKETS
-- Each ticket represents one passenger + one seat on one trip.
-- The generated active_seat_key + UNIQUE constraint prevents two active tickets
-- from holding/confirming the same seat on the same trip.
-- ============================================================================
CREATE TABLE tickets (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ticket_code         VARCHAR(30) NOT NULL,
    booking_id          BIGINT UNSIGNED NOT NULL,
    trip_id             BIGINT UNSIGNED NOT NULL,
    bus_seat_id         BIGINT UNSIGNED NOT NULL,
    passenger_name      VARCHAR(120) NOT NULL,
    passenger_phone     VARCHAR(20) NULL,
    fare                DECIMAL(12,2) NOT NULL,
    ticket_status       ENUM('HELD','CONFIRMED','USED','CANCELLED')
                        NOT NULL DEFAULT 'HELD',
    checked_in_at       DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    active_seat_key VARCHAR(80)
        GENERATED ALWAYS AS (
            CASE
                WHEN ticket_status IN ('HELD','CONFIRMED','USED')
                THEN CONCAT(trip_id, ':', bus_seat_id)
                ELSE NULL
            END
        ) STORED,

    PRIMARY KEY (id),
    CONSTRAINT uq_tickets_code UNIQUE (ticket_code),
    CONSTRAINT uq_tickets_active_seat UNIQUE (active_seat_key),
    CONSTRAINT fk_tickets_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
         ON DELETE RESTRICT,
	CONSTRAINT fk_tickets_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE CASCADE,
    CONSTRAINT fk_tickets_bus_seat
        FOREIGN KEY (bus_seat_id) REFERENCES bus_seats(id)
         ON DELETE RESTRICT,
    CONSTRAINT chk_tickets_fare CHECK (fare >= 0)
) ENGINE=InnoDB;

CREATE INDEX idx_tickets_booking ON tickets(booking_id, ticket_status);
CREATE INDEX idx_tickets_trip ON tickets(trip_id, ticket_status);

-- ============================================================================
-- 11. PAYMENTS
-- One payment intent per booking. CASH is confirmed by staff; SEPAY is confirmed
-- only by an authenticated SePay webhook matched to the payment_code.
-- ============================================================================
CREATE TABLE payments (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    payment_code        VARCHAR(30) NOT NULL,
    booking_id          BIGINT UNSIGNED NOT NULL,
    payment_method      ENUM('CASH','SEPAY') NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    payment_status      ENUM(
                            'PENDING',
                            'SUCCESS',
                            'FAILED',
                            'CANCELLED',
                            'REVIEW_REQUIRED'
                        ) NOT NULL DEFAULT 'PENDING',
    paid_at             DATETIME NULL,
    notes               VARCHAR(500) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT uq_payments_code UNIQUE (payment_code),
    CONSTRAINT uq_payments_booking UNIQUE (booking_id),
    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
		ON DELETE RESTRICT,
    CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_payments_status_created
    ON payments(payment_status, created_at);

-- ============================================================================
-- 12. PAYMENT_TRANSACTIONS
-- Immutable-ish audit/processing log for real SePay webhook events.
-- Every SePay transaction id is unique across retries/replays.
-- payment_id may be NULL for unmatched incoming transfers.
-- ============================================================================
CREATE TABLE payment_transactions (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    payment_id              BIGINT UNSIGNED NULL,
    sepay_transaction_id    BIGINT UNSIGNED NOT NULL,
    gateway                 VARCHAR(100) NOT NULL,
    transaction_date        DATETIME NOT NULL,
    account_number          VARCHAR(100) NOT NULL,
    sub_account             VARCHAR(150) NULL,
    payment_code            VARCHAR(100) NULL,
    transfer_type           ENUM('in','out') NOT NULL,
    transfer_amount         BIGINT UNSIGNED NOT NULL,
    accumulated             BIGINT UNSIGNED NULL,
    reference_code          VARCHAR(255) NULL,
    content                 TEXT NOT NULL,
    description             TEXT NULL,
    processing_status       ENUM(
                                'RECEIVED',
                                'PROCESSED',
                                'REVIEW_REQUIRED',
                                'IGNORED'
                            ) NOT NULL DEFAULT 'RECEIVED',
    review_reason           VARCHAR(500) NULL,
    webhook_timestamp       BIGINT NULL,
    webhook_signature       VARCHAR(255) NULL,
    raw_payload             JSON NOT NULL,
    received_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at            DATETIME NULL,

    PRIMARY KEY (id),
    CONSTRAINT uq_payment_transactions_sepay_id UNIQUE (sepay_transaction_id),
    CONSTRAINT fk_payment_transactions_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
         ON DELETE SET NULL,
    CONSTRAINT chk_payment_transactions_amount CHECK (transfer_amount > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_payment_transactions_payment
    ON payment_transactions(payment_id, received_at);
CREATE INDEX idx_payment_transactions_code
    ON payment_transactions(payment_code, processing_status);
CREATE INDEX idx_payment_transactions_status
    ON payment_transactions(processing_status, received_at);

-- ============================================================================
-- DATABASE-LEVEL BUSINESS RULES / TRIGGERS
-- ============================================================================

DELIMITER $$

-- --------------------------------------------------------------------------
-- BR: Active seats configured for a bus must not exceed seat_capacity.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_bus_seats_before_insert
BEFORE INSERT ON bus_seats
FOR EACH ROW
BEGIN
    DECLARE v_capacity INT DEFAULT 0;
    DECLARE v_active_count INT DEFAULT 0;

    SELECT seat_capacity INTO v_capacity
    FROM buses
    WHERE id = NEW.bus_id;

    IF NEW.is_active = TRUE THEN
        SELECT COUNT(*) INTO v_active_count
        FROM bus_seats
        WHERE bus_id = NEW.bus_id AND is_active = TRUE;

        IF v_active_count >= v_capacity THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cannot add seat: active seats exceed bus seat_capacity.';
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_bus_seats_before_update
BEFORE UPDATE ON bus_seats
FOR EACH ROW
BEGIN
    DECLARE v_capacity INT DEFAULT 0;
    DECLARE v_active_count INT DEFAULT 0;

    IF NEW.is_active = TRUE AND (OLD.is_active = FALSE OR NEW.bus_id <> OLD.bus_id) THEN
        SELECT seat_capacity INTO v_capacity
        FROM buses
        WHERE id = NEW.bus_id;

        SELECT COUNT(*) INTO v_active_count
        FROM bus_seats
        WHERE bus_id = NEW.bus_id
          AND is_active = TRUE
          AND id <> OLD.id;

        IF v_active_count >= v_capacity THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cannot activate/move seat: active seats exceed bus seat_capacity.';
        END IF;
    END IF;
END$$

-- --------------------------------------------------------------------------
-- BR: A bus must be ACTIVE and cannot serve overlapping non-cancelled trips.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_trips_before_insert
BEFORE INSERT ON trips
FOR EACH ROW
BEGIN
    DECLARE v_bus_status VARCHAR(20);
    DECLARE v_overlap_count INT DEFAULT 0;

    IF NEW.arrival_time <= NEW.departure_time THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Trip arrival_time must be after departure_time.';
    END IF;

    IF NEW.bus_id IS NOT NULL AND NEW.status <> 'CANCELLED' THEN
        SELECT status INTO v_bus_status
        FROM buses
        WHERE id = NEW.bus_id;

        IF v_bus_status <> 'ACTIVE' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Assigned bus must have ACTIVE status.';
        END IF;

        SELECT COUNT(*) INTO v_overlap_count
        FROM trips
        WHERE bus_id = NEW.bus_id
          AND status <> 'CANCELLED'
          AND NEW.departure_time < arrival_time
          AND NEW.arrival_time > departure_time;

        IF v_overlap_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Bus schedule conflict: overlapping trip exists.';
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_trips_before_update
BEFORE UPDATE ON trips
FOR EACH ROW
BEGIN
    DECLARE v_bus_status VARCHAR(20);
    DECLARE v_overlap_count INT DEFAULT 0;
    DECLARE v_staff_overlap_count INT DEFAULT 0;

    IF NEW.arrival_time <= NEW.departure_time THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Trip arrival_time must be after departure_time.';
    END IF;

    IF NEW.bus_id IS NOT NULL AND NEW.status <> 'CANCELLED' THEN
        SELECT status INTO v_bus_status
        FROM buses
        WHERE id = NEW.bus_id;

        IF v_bus_status <> 'ACTIVE' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Assigned bus must have ACTIVE status.';
        END IF;

        SELECT COUNT(*) INTO v_overlap_count
        FROM trips
        WHERE bus_id = NEW.bus_id
          AND id <> OLD.id
          AND status <> 'CANCELLED'
          AND NEW.departure_time < arrival_time
          AND NEW.arrival_time > departure_time;

        IF v_overlap_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Bus schedule conflict: overlapping trip exists.';
        END IF;
    END IF;

    -- If an already-assigned trip changes time, assigned staff must still be free.
    IF NEW.status <> 'CANCELLED' THEN
        SELECT COUNT(*) INTO v_staff_overlap_count
        FROM trip_staff_assignments current_assignment
        JOIN trip_staff_assignments other_assignment
          ON other_assignment.employee_id = current_assignment.employee_id
         AND other_assignment.trip_id <> NEW.id
        JOIN trips other_trip
          ON other_trip.id = other_assignment.trip_id
        WHERE current_assignment.trip_id = NEW.id
          AND other_trip.status <> 'CANCELLED'
          AND NEW.departure_time < other_trip.arrival_time
          AND NEW.arrival_time > other_trip.departure_time;

        IF v_staff_overlap_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Staff schedule conflict after trip time change.';
        END IF;
    END IF;
END$$

-- --------------------------------------------------------------------------
-- BR: Assignment role must match employee type; employee cannot overlap trips.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_trip_staff_before_insert
BEFORE INSERT ON trip_staff_assignments
FOR EACH ROW
BEGIN
    DECLARE v_employee_type VARCHAR(20);
    DECLARE v_employee_active BOOLEAN;
    DECLARE v_departure DATETIME;
    DECLARE v_arrival DATETIME;
    DECLARE v_trip_status VARCHAR(30);
    DECLARE v_overlap_count INT DEFAULT 0;

    SELECT employee_type, is_active
      INTO v_employee_type, v_employee_active
    FROM employees
    WHERE id = NEW.employee_id;

    IF v_employee_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inactive employee cannot be assigned to a trip.';
    END IF;

    IF v_employee_type <> NEW.assignment_role THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assignment role must match employee_type.';
    END IF;

    SELECT departure_time, arrival_time, status
      INTO v_departure, v_arrival, v_trip_status
    FROM trips
    WHERE id = NEW.trip_id;

    IF v_trip_status = 'CANCELLED' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot assign staff to a cancelled trip.';
    END IF;

    SELECT COUNT(*) INTO v_overlap_count
    FROM trip_staff_assignments tsa
    JOIN trips t ON t.id = tsa.trip_id
    WHERE tsa.employee_id = NEW.employee_id
      AND t.status <> 'CANCELLED'
      AND v_departure < t.arrival_time
      AND v_arrival > t.departure_time;

    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Employee schedule conflict: overlapping trip exists.';
    END IF;
END$$

CREATE TRIGGER trg_trip_staff_before_update
BEFORE UPDATE ON trip_staff_assignments
FOR EACH ROW
BEGIN
    DECLARE v_employee_type VARCHAR(20);
    DECLARE v_employee_active BOOLEAN;
    DECLARE v_departure DATETIME;
    DECLARE v_arrival DATETIME;
    DECLARE v_trip_status VARCHAR(30);
    DECLARE v_overlap_count INT DEFAULT 0;

    SELECT employee_type, is_active
      INTO v_employee_type, v_employee_active
    FROM employees
    WHERE id = NEW.employee_id;

    IF v_employee_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inactive employee cannot be assigned to a trip.';
    END IF;

    IF v_employee_type <> NEW.assignment_role THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assignment role must match employee_type.';
    END IF;

    SELECT departure_time, arrival_time, status
      INTO v_departure, v_arrival, v_trip_status
    FROM trips
    WHERE id = NEW.trip_id;

    IF v_trip_status = 'CANCELLED' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot assign staff to a cancelled trip.';
    END IF;

    SELECT COUNT(*) INTO v_overlap_count
    FROM trip_staff_assignments tsa
    JOIN trips t ON t.id = tsa.trip_id
    WHERE tsa.employee_id = NEW.employee_id
      AND tsa.id <> OLD.id
      AND t.status <> 'CANCELLED'
      AND v_departure < t.arrival_time
      AND v_arrival > t.departure_time;

    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Employee schedule conflict: overlapping trip exists.';
    END IF;
END$$

-- --------------------------------------------------------------------------
-- BR: Booking may only be created for a future trip open for booking.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_bookings_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_trip_status VARCHAR(30);
    DECLARE v_departure DATETIME;

    SELECT status, departure_time
      INTO v_trip_status, v_departure
    FROM trips
    WHERE id = NEW.trip_id;

    IF v_trip_status <> 'OPEN_FOR_BOOKING' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking can only be created for an OPEN_FOR_BOOKING trip.';
    END IF;

    IF v_departure <= CURRENT_TIMESTAMP THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot create booking for a departed/past trip.';
    END IF;

    -- Default payment/seat hold window: 15 minutes.
    -- Django may supply another future expires_at value from configuration.
    IF NEW.expires_at IS NULL THEN
        SET NEW.expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE);
    END IF;

    IF NEW.expires_at <= CURRENT_TIMESTAMP THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking expires_at must be in the future.';
    END IF;

    IF NEW.expires_at >= v_departure THEN
        SET NEW.expires_at = DATE_SUB(v_departure, INTERVAL 1 MINUTE);
    END IF;
END$$

CREATE TRIGGER trg_bookings_before_update
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
    DECLARE v_ticket_count INT DEFAULT 0;

    IF NEW.trip_id <> OLD.trip_id THEN
        SELECT COUNT(*) INTO v_ticket_count
        FROM tickets
        WHERE booking_id = OLD.id;

        IF v_ticket_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Cannot change booking trip after tickets have been created.';
        END IF;
    END IF;

    IF NEW.expires_at IS NOT NULL
       AND NEW.booking_status = 'PENDING'
       AND NEW.expires_at <= CURRENT_TIMESTAMP
       AND OLD.booking_status = 'PENDING' THEN
        SET NEW.booking_status = 'EXPIRED';
    END IF;

    IF NEW.booking_status = 'CANCELLED' AND OLD.booking_status = 'CONFIRMED' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Confirmed booking cancellation requires manual handling; automatic refund is out of scope.';
    END IF;
END$$

-- --------------------------------------------------------------------------
-- BR: Ticket seat must belong to the bus assigned to the trip.
-- The generated UNIQUE key handles double booking for active ticket states.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_tickets_before_insert
BEFORE INSERT ON tickets
FOR EACH ROW
BEGIN
    DECLARE v_trip_bus_id BIGINT UNSIGNED;
    DECLARE v_seat_bus_id BIGINT UNSIGNED;
    DECLARE v_trip_status VARCHAR(30);
    DECLARE v_seat_active BOOLEAN;

    SELECT bus_id, status
      INTO v_trip_bus_id, v_trip_status
    FROM trips
    WHERE id = NEW.trip_id;

    IF v_trip_bus_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Trip must have a bus before tickets can be created.';
    END IF;

    IF v_trip_status <> 'OPEN_FOR_BOOKING' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Tickets can only be created while trip is OPEN_FOR_BOOKING.';
    END IF;

    SELECT bus_id, is_active
      INTO v_seat_bus_id, v_seat_active
    FROM bus_seats
    WHERE id = NEW.bus_seat_id;

    IF v_seat_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Selected bus seat is inactive.';
    END IF;

    IF v_trip_bus_id <> v_seat_bus_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Selected seat does not belong to the bus assigned to this trip.';
    END IF;
END$$

CREATE TRIGGER trg_tickets_before_update
BEFORE UPDATE ON tickets
FOR EACH ROW
BEGIN
    IF NEW.booking_id <> OLD.booking_id
       OR NEW.trip_id <> OLD.trip_id
       OR NEW.bus_seat_id <> OLD.bus_seat_id
       OR NEW.fare <> OLD.fare THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ticket booking/trip/seat/fare cannot be changed after ticket creation.';
    END IF;
END$$

-- --------------------------------------------------------------------------
-- BR: booking.total_amount is calculated when tickets are created and kept as
-- a historical transaction value. Cancelling a booking does not erase it.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_tickets_after_insert
AFTER INSERT ON tickets
FOR EACH ROW
BEGIN
    IF NEW.ticket_status <> 'CANCELLED' THEN
        UPDATE bookings
        SET total_amount = total_amount + NEW.fare
        WHERE id = NEW.booking_id;
    END IF;
END$$

-- Direct ticket deletion is not part of the MVP; use status = CANCELLED so
-- history and seat-release behavior remain explicit.
CREATE TRIGGER trg_tickets_before_delete
BEFORE DELETE ON tickets
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Do not delete tickets directly; set ticket_status = CANCELLED.';
END$$

-- --------------------------------------------------------------------------
-- BR: Payment amount must equal booking total; cancelled booking cannot pay.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_payments_before_insert
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE v_total DECIMAL(12,2);
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_expires_at DATETIME;

    SELECT total_amount, booking_status, expires_at
      INTO v_total, v_booking_status, v_expires_at
    FROM bookings
    WHERE id = NEW.booking_id;

    IF v_booking_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Payment intent can only be created for a PENDING booking.';
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at <= CURRENT_TIMESTAMP THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot create payment for an expired booking.';
    END IF;

    IF NEW.amount <> v_total THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Payment amount must equal booking total_amount.';
    END IF;

    IF NEW.payment_status = 'SUCCESS' AND NEW.payment_method = 'SEPAY' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'SEPAY payment must become SUCCESS only after authenticated webhook processing.';
    END IF;

    IF NEW.payment_status = 'SUCCESS' AND NEW.paid_at IS NULL THEN
        SET NEW.paid_at = CURRENT_TIMESTAMP;
    END IF;
END$$

CREATE TRIGGER trg_payments_before_update
BEFORE UPDATE ON payments
FOR EACH ROW
BEGIN
    DECLARE v_total DECIMAL(12,2);
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_expires_at DATETIME;

    SELECT total_amount, booking_status, expires_at
      INTO v_total, v_booking_status, v_expires_at
    FROM bookings
    WHERE id = NEW.booking_id;

    IF NEW.booking_id <> OLD.booking_id OR NEW.amount <> OLD.amount THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Payment booking_id and amount are immutable after creation.';
    END IF;

    IF NEW.amount <> v_total THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Payment amount must equal booking total_amount.';
    END IF;

    IF NEW.payment_status = 'SUCCESS'
       AND OLD.payment_status <> 'SUCCESS' THEN

        IF v_booking_status <> 'PENDING' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Only a PENDING booking can be confirmed by payment.';
        END IF;

        IF v_expires_at IS NOT NULL AND v_expires_at <= CURRENT_TIMESTAMP THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Late payment cannot auto-confirm an expired booking; mark for review.';
        END IF;

        IF NEW.paid_at IS NULL THEN
            SET NEW.paid_at = CURRENT_TIMESTAMP;
        END IF;
    END IF;
END$$

-- --------------------------------------------------------------------------
-- Payment SUCCESS confirms the booking and all held tickets atomically.
-- For SEPAY, Django must verify HMAC + timestamp, persist payment_transactions,
-- validate account/code/amount, then transition payment to SUCCESS inside transaction.atomic().
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_payments_after_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'SUCCESS' THEN
        UPDATE bookings
        SET booking_status = 'CONFIRMED'
        WHERE id = NEW.booking_id;

        UPDATE tickets
        SET ticket_status = 'CONFIRMED'
        WHERE booking_id = NEW.booking_id
          AND ticket_status = 'HELD';
    END IF;
END$$

CREATE TRIGGER trg_payments_after_update
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    IF NEW.payment_status = 'SUCCESS' AND OLD.payment_status <> 'SUCCESS' THEN
        UPDATE bookings
        SET booking_status = 'CONFIRMED'
        WHERE id = NEW.booking_id;

        UPDATE tickets
        SET ticket_status = 'CONFIRMED'
        WHERE booking_id = NEW.booking_id
          AND ticket_status = 'HELD';
    END IF;
END$$

-- --------------------------------------------------------------------------
-- Cancelling or expiring a PENDING booking releases held seats and cancels pending payment intent.
-- --------------------------------------------------------------------------
CREATE TRIGGER trg_bookings_after_update
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
    IF NEW.booking_status IN ('CANCELLED','EXPIRED')
       AND OLD.booking_status NOT IN ('CANCELLED','EXPIRED') THEN
        UPDATE tickets
        SET ticket_status = 'CANCELLED'
        WHERE booking_id = NEW.id
          AND ticket_status = 'HELD';

        UPDATE payments
        SET payment_status = 'CANCELLED'
        WHERE booking_id = NEW.id
          AND payment_status = 'PENDING';
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- READ VIEWS FOR DEMO / DASHBOARD
-- ============================================================================

CREATE OR REPLACE VIEW v_trip_availability AS
SELECT
    t.id AS trip_id,
    t.trip_code,
    t.departure_time,
    t.arrival_time,
    t.status AS trip_status,
    r.route_code,
    r.route_name,
    origin.name AS origin_station,
    destination.name AS destination_station,
    b.id AS bus_id,
    b.license_plate,
    b.bus_type,
    t.ticket_price,
    (
        SELECT COUNT(*)
        FROM bus_seats bs
        WHERE bs.bus_id = b.id AND bs.is_active = TRUE
    ) AS total_active_seats,
    (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.trip_id = t.id
          AND tk.ticket_status IN ('HELD','CONFIRMED','USED')
    ) AS occupied_or_held_seats,
    (
        SELECT COUNT(*)
        FROM bus_seats bs
        WHERE bs.bus_id = b.id AND bs.is_active = TRUE
    ) - (
        SELECT COUNT(*)
        FROM tickets tk
        WHERE tk.trip_id = t.id
          AND tk.ticket_status IN ('HELD','CONFIRMED','USED')
    ) AS available_seats
FROM trips t
JOIN routes r ON r.id = t.route_id
JOIN stations origin ON origin.id = r.origin_station_id
JOIN stations destination ON destination.id = r.destination_station_id
LEFT JOIN buses b ON b.id = t.bus_id;

CREATE OR REPLACE VIEW v_booking_summary AS
SELECT
    bk.id AS booking_id,
    bk.booking_code,
    bk.booking_status,
    bk.contact_name,
    bk.contact_phone,
    bk.total_amount,
    bk.expires_at,
    bk.created_at,
    t.trip_code,
    t.departure_time,
    r.route_name,
    COUNT(tk.id) AS ticket_count,
    p.payment_method,
    p.payment_status,
    p.paid_at,
    pt.sepay_transaction_id,
    pt.processing_status AS sepay_processing_status
FROM bookings bk
JOIN trips t ON t.id = bk.trip_id
JOIN routes r ON r.id = t.route_id
LEFT JOIN tickets tk
       ON tk.booking_id = bk.id
      AND tk.ticket_status <> 'CANCELLED'
LEFT JOIN payments p ON p.booking_id = bk.id
LEFT JOIN payment_transactions pt
       ON pt.id = (
           SELECT pt2.id
           FROM payment_transactions pt2
           WHERE pt2.payment_id = p.id
           ORDER BY pt2.received_at DESC, pt2.id DESC
           LIMIT 1
       )
GROUP BY
    bk.id, bk.booking_code, bk.booking_status, bk.contact_name,
    bk.contact_phone, bk.total_amount, bk.expires_at, bk.created_at,
    t.trip_code, t.departure_time, r.route_name,
    p.payment_method, p.payment_status, p.paid_at,
    pt.sepay_transaction_id, pt.processing_status;

-- ============================================================================
-- OPTIONAL DEMO MASTER DATA
-- Password-bearing users are intentionally NOT seeded here.
-- Create users through Django so password_hash uses Django's password hasher.
-- ============================================================================

INSERT INTO stations (station_code, name, province_city, address)
VALUES
    ('SG-MD', 'Ben xe Mien Dong Moi', 'TP. Ho Chi Minh', 'TP. Thu Duc'),
    ('DL-BX', 'Ben xe Da Lat', 'Lam Dong', 'Da Lat')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO routes (
    route_code, route_name, origin_station_id, destination_station_id,
    distance_km, estimated_duration_minutes, base_price, status
)
SELECT
    'SG-DL',
    'TP. Ho Chi Minh - Da Lat',
    s1.id,
    s2.id,
    310.00,
    420,
    300000.00,
    'ACTIVE'
FROM stations s1
JOIN stations s2
  ON s1.station_code = 'SG-MD'
 AND s2.station_code = 'DL-BX'
WHERE NOT EXISTS (SELECT 1 FROM routes WHERE route_code = 'SG-DL');

INSERT INTO buses (license_plate, bus_name, bus_type, seat_capacity, status)
SELECT '51B-123.45', 'Limousine 01', 'LIMOUSINE', 10, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM buses WHERE license_plate = '51B-123.45');

INSERT INTO bus_seats (bus_id, seat_number, seat_type, floor_number, seat_row, column_number)
SELECT b.id, x.seat_number, x.seat_type, 1, x.seat_row, x.column_number
FROM buses b
JOIN (
    SELECT 'A01' AS seat_number, 'VIP' AS seat_type, 1 AS seat_row, 1 AS column_number UNION ALL
    SELECT 'A02', 'VIP', 1, 2 UNION ALL
    SELECT 'A03', 'STANDARD', 2, 1 UNION ALL
    SELECT 'A04', 'STANDARD', 2, 2 UNION ALL
    SELECT 'A05', 'STANDARD', 3, 1 UNION ALL
    SELECT 'A06', 'STANDARD', 3, 2 UNION ALL
    SELECT 'A07', 'STANDARD', 4, 1 UNION ALL
    SELECT 'A08', 'STANDARD', 4, 2 UNION ALL
    SELECT 'A09', 'STANDARD', 5, 1 UNION ALL
    SELECT 'A10', 'STANDARD', 5, 2
) x
WHERE b.license_plate = '51B-123.45'
  AND NOT EXISTS (
      SELECT 1
      FROM bus_seats bs
      WHERE bs.bus_id = b.id AND bs.seat_number = x.seat_number
  );

INSERT INTO employees (
    employee_code, full_name, phone, employee_type,
    license_number, license_class, license_expiry, hire_date
)
SELECT 'DRV001', 'Nguyen Van Tai', '0901000001', 'DRIVER',
       'GPLX-DRV001', 'E', '2029-12-31', '2025-01-01'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'DRV001');

INSERT INTO employees (
    employee_code, full_name, phone, employee_type, hire_date
)
SELECT 'ATT001', 'Tran Van Phu', '0901000002', 'BUS_ATTENDANT', '2025-01-01'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_code = 'ATT001');

-- Create a future demo trip relative to the current date only if it does not exist.
INSERT INTO trips (
    trip_code, route_id, bus_id, departure_time, arrival_time,
    ticket_price, status, notes
)
SELECT
    'TRIP-DEMO-001',
    r.id,
    b.id,
    DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 DAY),
    DATE_ADD(DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 DAY), INTERVAL 7 HOUR),
    320000.00,
    'OPEN_FOR_BOOKING',
    'Demo trip generated by initialization script.'
FROM routes r
JOIN buses b ON b.license_plate = '51B-123.45'
WHERE r.route_code = 'SG-DL'
  AND NOT EXISTS (SELECT 1 FROM trips WHERE trip_code = 'TRIP-DEMO-001');

INSERT INTO trip_staff_assignments (trip_id, employee_id, assignment_role)
SELECT t.id, e.id, 'DRIVER'
FROM trips t
JOIN employees e ON e.employee_code = 'DRV001'
WHERE t.trip_code = 'TRIP-DEMO-001'
  AND NOT EXISTS (
      SELECT 1 FROM trip_staff_assignments tsa
      WHERE tsa.trip_id = t.id AND tsa.employee_id = e.id
  );

INSERT INTO trip_staff_assignments (trip_id, employee_id, assignment_role)
SELECT t.id, e.id, 'BUS_ATTENDANT'
FROM trips t
JOIN employees e ON e.employee_code = 'ATT001'
WHERE t.trip_code = 'TRIP-DEMO-001'
  AND NOT EXISTS (
      SELECT 1 FROM trip_staff_assignments tsa
      WHERE tsa.trip_id = t.id AND tsa.employee_id = e.id
  );

-- ============================================================================
-- USEFUL VERIFICATION QUERIES
-- ============================================================================

-- 1) Find trips available for booking:
-- SELECT * FROM v_trip_availability
-- WHERE trip_status = 'OPEN_FOR_BOOKING'
-- ORDER BY departure_time;

-- 2) View seats for a trip and whether they are occupied/held:
-- SELECT
--     bs.id AS bus_seat_id,
--     bs.seat_number,
--     bs.seat_type,
--     CASE WHEN tk.id IS NULL THEN 'AVAILABLE' ELSE tk.ticket_status END AS seat_status
-- FROM trips t
-- JOIN bus_seats bs ON bs.bus_id = t.bus_id AND bs.is_active = TRUE
-- LEFT JOIN tickets tk
--        ON tk.trip_id = t.id
--       AND tk.bus_seat_id = bs.id
--       AND tk.ticket_status IN ('HELD','CONFIRMED','USED')
-- WHERE t.trip_code = 'TRIP-DEMO-001'
-- ORDER BY bs.row_number, bs.column_number, bs.seat_number;

-- 3) Booking/payment summary:
-- SELECT * FROM v_booking_summary ORDER BY created_at DESC;

-- 4) SePay webhook transaction audit:
-- SELECT *
-- FROM payment_transactions
-- ORDER BY received_at DESC;

-- IMPORTANT SEPAY APPLICATION FLOW:
--   a) Verify X-SePay-Signature using HMAC-SHA256 over:
--        {X-SePay-Timestamp}.{raw_request_body}
--   b) Reject stale timestamps (recommended <= 5 minutes).
--   c) Before confirming a booking, validate transfer_type='in',
--      payment_code, transfer_amount, and account_number.
--   d) INSERT payment_transactions with sepay_transaction_id UNIQUE.
--      If the same SePay id is received again, return HTTP 200 success without
--      re-running business logic (idempotency).
--   e) Valid + on-time transfer -> payment SUCCESS -> DB confirms booking/tickets.
--      Late/wrong/extra transfer -> transaction/payment REVIEW_REQUIRED; do not
--      re-allocate released seats automatically.

-- ============================================================================
-- END OF FILE
-- ============================================================================
