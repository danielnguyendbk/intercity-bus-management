import asyncio
import unittest
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.dependencies import get_current_user, require_staff
from app.main import app
from app.models import User, Passenger, Trip, Ticket, Payment, TicketStatus, PaymentStatus
from app.services.sepay_service import SePayService
from app.services.booking_service import BookingService


@compiles(BigInteger, "sqlite")
def sqlite_integer(element, compiler, **kw):
    return "INTEGER"


class SePayTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(id=1, username="customer", passwordHash="unused")
        passenger = Passenger(id=1, user=self.user, fullName="Test", phone="000")
        trip = Trip(id=1, departureTime=datetime.now() + timedelta(days=1))
        self.ticket = Ticket(id=1, passenger=passenger, trip=trip, price=Decimal("250000"), status=TicketStatus.HOLD)
        self.db.add(self.ticket)
        self.db.commit()
        self.config = SimpleNamespace(SEPAY_API_KEY="test-api", SEPAY_WEBHOOK_TOKEN="test-webhook", SEPAY_BANK_CODE="BIDV", SEPAY_ACCOUNT_NUMBER="TEST123", SEPAY_ACCOUNT_NAME="TEST ACCOUNT")
        self.config_patch = patch("app.services.sepay_service.settings", self.config)
        self.config_patch.start()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.config_patch.stop()
        self.db.close()
        self.engine.dispose()

    def checkout(self):
        SePayService.create_payment(1, self.user, self.db)
        return self.db.query(Payment).one()

    def transaction(self, **changes):
        payment = self.checkout()
        data = {"id": "123", "amount_in": "250000.00", "amount_out": "0", "account_number": "TEST123", "transaction_content": "transfer " + payment.paymentCode, "reference_number": "BANK123"}
        data.update(changes)
        return data

    def test_checkout_qr_and_idempotency(self):
        payment = self.checkout()
        code = payment.paymentCode
        result = BookingService._to_ticket_response(self.ticket)
        query = parse_qs(urlparse(result.qrUrl).query)
        self.assertEqual(query["amount"], ["250000"])
        self.assertEqual(query["acc"], ["TEST123"])
        self.assertEqual(query["des"], [code])
        self.assertNotIn("test-api", result.model_dump_json())
        self.assertEqual(self.checkout().paymentCode, code)
        self.assertEqual(self.db.query(Payment).count(), 1)

    def test_owner_required_for_create_and_status(self):
        payment = self.checkout()
        stranger = SimpleNamespace(id=2)
        with self.assertRaises(HTTPException) as error:
            SePayService.create_payment(1, stranger, self.db)
        self.assertEqual(error.exception.status_code, 403)
        with self.assertRaises(HTTPException) as error:
            SePayService.get_status(payment.paymentCode, stranger, self.db)
        self.assertEqual(error.exception.status_code, 404)

    def test_payment_commits_once_and_replay_is_ignored(self):
        transaction = self.transaction()
        event = SePayService.settle(transaction, self.db)
        self.assertEqual(event["transactionId"], "123")
        self.assertEqual(self.ticket.status, TicketStatus.PAID)
        paid_at = self.ticket.paidAt
        self.assertIsNone(SePayService.settle(transaction, self.db))
        self.assertEqual(self.ticket.paidAt, paid_at)
        self.assertIsNone(BookingService._to_ticket_response(self.ticket).qrUrl)

    def test_wrong_account_does_not_settle(self):
        self.assertIsNone(SePayService.settle(self.transaction(account_number="OTHER"), self.db))
        self.assertEqual(self.ticket.status, TicketStatus.HOLD)
        self.assertEqual(self.db.query(Payment).one().status, PaymentStatus.PENDING)

    def test_outgoing_does_not_settle(self):
        self.assertIsNone(SePayService.settle(self.transaction(amount_in="0", amount_out="250000"), self.db))
        self.assertEqual(self.ticket.status, TicketStatus.HOLD)

    def test_amount_mismatch_requires_review(self):
        SePayService.settle(self.transaction(amount_in="240000"), self.db)
        self.assertEqual(self.db.query(Payment).one().status, PaymentStatus.REVIEW_REQUIRED)
        self.assertEqual(self.ticket.status, TicketStatus.HOLD)
        self.assertIsNone(BookingService._to_ticket_response(self.ticket).qrUrl)

    def test_late_payment_does_not_revive_cancelled_ticket(self):
        transaction = self.transaction()
        self.ticket.status = TicketStatus.CANCELLED
        self.db.commit()
        SePayService.settle(transaction, self.db)
        self.assertEqual(self.ticket.status, TicketStatus.CANCELLED)
        self.assertEqual(self.db.query(Payment).one().status, PaymentStatus.REVIEW_REQUIRED)

    def test_missing_config_fails_closed(self):
        self.config.SEPAY_API_KEY = ""
        with self.assertRaises(HTTPException) as error:
            self.checkout()
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(self.db.query(Payment).count(), 0)

    def test_closed_payment_cannot_reuse_qr(self):
        payment = self.checkout()
        payment.status = PaymentStatus.FAILED
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            SePayService.create_payment(1, self.user, self.db)
        self.assertEqual(error.exception.status_code, 409)
        self.assertIsNone(BookingService._to_ticket_response(self.ticket).qrUrl)

    def test_unknown_code_does_not_settle(self):
        transaction = self.transaction(transaction_content="BUS" + "0" * 24)
        self.assertIsNone(SePayService.settle(transaction, self.db))
        self.assertEqual(self.ticket.status, TicketStatus.HOLD)

    def test_transaction_id_cannot_pay_two_tickets(self):
        transaction = self.transaction()
        SePayService.settle(transaction, self.db)
        second = Ticket(id=2, passenger=self.ticket.passenger, trip=self.ticket.trip,
                        price=Decimal("250000"), status=TicketStatus.HOLD)
        self.db.add(second)
        self.db.commit()
        SePayService.create_payment(2, self.user, self.db)
        transaction["transaction_content"] = second.payment.paymentCode
        self.assertIsNone(SePayService.settle(transaction, self.db))
        self.assertEqual(second.status, TicketStatus.HOLD)
        self.assertEqual(second.payment.status, PaymentStatus.PENDING)

    def test_api_verification_uses_provider_data(self):
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.get.return_value = httpx.Response(200, json={"transaction": {"id": "123", "amount_in": "250000"}}, request=httpx.Request("GET", "https://my.sepay.vn/"))
        with patch("app.services.sepay_service.httpx.AsyncClient", return_value=client):
            result = asyncio.run(SePayService.verify_transaction({"id": "123", "transferAmount": 1}))
        self.assertEqual(result["amount_in"], "250000")
        self.assertEqual(client.get.call_args.kwargs["headers"]["Authorization"], "Bearer test-api")

    def test_api_failure_is_retryable(self):
        client = AsyncMock()
        client.__aenter__.return_value = client
        client.get.side_effect = httpx.ConnectError("unavailable")
        with patch("app.services.sepay_service.httpx.AsyncClient", return_value=client):
            with self.assertRaises(HTTPException) as error:
                asyncio.run(SePayService.verify_transaction({"id": "123"}))
        self.assertEqual(error.exception.status_code, 502)

    def test_webhook_auth_and_route_settlement(self):
        transaction = self.transaction()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        with TestClient(app) as client, patch.object(SePayService, "verify_transaction", new_callable=AsyncMock, return_value=transaction) as verify:
            bad = client.post("/api/public/payment/sepay/webhook", json={"id": 123})
            self.assertEqual(bad.status_code, 401)
            verify.assert_not_called()
            good = client.post("/api/public/payment/sepay/webhook", json={"id": 123}, headers={"Authorization": "Apikey test-webhook"})
            self.assertEqual(good.json(), {"success": True})
            self.assertEqual(self.ticket.status, TicketStatus.PAID)
            self.assertEqual(client.post("/api/private/payment/vnpay/create", json={"ticketId": 1}).status_code, 404)
            self.assertEqual(client.put("/api/private/tickets/1/pay", json={"paymentMethod": "SEPAY"}).status_code, 404)

    def test_admin_cannot_manually_confirm_sepay_payment(self):
        payment = self.checkout()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[require_staff] = lambda: self.user
        with TestClient(app) as client:
            for action in ("mark-paid", "confirm"):
                response = client.put(f"/api/admin/tickets/1/{action}")
                self.assertEqual(response.status_code, 409)
                self.assertEqual(self.ticket.status, TicketStatus.HOLD)
                self.assertEqual(payment.status, PaymentStatus.PENDING)
                self.assertIsNone(self.ticket.paidAt)

    def test_configured_webhook_aliases_share_auth_and_settlement(self):
        transaction = self.transaction()
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client, patch.object(SePayService, "verify_transaction", new_callable=AsyncMock, return_value=transaction) as verify:
            paths = ("/api/payments/webhook/sepay/", "/api/payments/webhook/sepay")
            for path in paths:
                bad = client.post(path, json={"id": 123}, follow_redirects=False)
                self.assertEqual(bad.status_code, 401)
            verify.assert_not_called()
            for path in paths:
                good = client.post(path, json={"id": 123}, headers={"Authorization": "Apikey test-webhook"}, follow_redirects=False)
                self.assertEqual(good.status_code, 200)
                self.assertEqual(good.json(), {"success": True})
            self.assertEqual(self.ticket.status, TicketStatus.PAID)
            self.assertEqual(self.db.query(Payment).count(), 1)

    def test_admin_can_still_record_cash_payment(self):
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[require_staff] = lambda: self.user
        with TestClient(app) as client:
            response = client.put("/api/admin/tickets/1/mark-paid")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.ticket.status, TicketStatus.PAID)
        self.assertEqual(self.ticket.payment.paymentMethod, "CASH")

    def test_create_and_poll_never_mark_paid(self):
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        with TestClient(app) as client:
            response = client.post("/api/private/payment/sepay/create", json={"ticketId": 1})
            self.assertEqual(response.status_code, 200)
            code = response.json()["paymentCode"]
            for _ in range(3):
                result = client.get(f"/api/private/payment/{code}/status")
                self.assertEqual(result.json()["paymentStatus"], "PENDING")
        self.assertEqual(self.ticket.status, TicketStatus.HOLD)
        self.assertIsNone(self.ticket.paidAt)


if __name__ == "__main__":
    unittest.main()
