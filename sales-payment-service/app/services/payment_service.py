from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
import os

from app.models.payment import Payment
from app.exceptions.custom_exceptions import NotFoundException, ConflictException
from app.utils.service_client import authenticated_get, authenticated_post

INVOICE_SERVICE_URL = os.getenv("INVOICE_SERVICE_URL")


# -----------------------------
# FETCH INVOICE
# -----------------------------
def fetch_invoice(invoice_id: int, auth_header: str):

    response = authenticated_get(
        f"{INVOICE_SERVICE_URL}/invoices/{invoice_id}",
        auth_header
    )

    if response.status_code != 200:
        raise NotFoundException("Invoice not found")

    return response.json()


# -----------------------------
# UPDATE INVOICE STATUS
# -----------------------------
def update_invoice_status(invoice_id: int, status: str, auth_header: str):

    response = authenticated_post(
        f"{INVOICE_SERVICE_URL}/invoices/{invoice_id}/status",
        auth_header,
        json={"status": status}
    )

    if response.status_code not in (200, 201):
        raise ConflictException("Failed to update invoice status")


# -----------------------------
# CREATE PAYMENT
# -----------------------------
def create_payment(
    db: Session,
    invoice_id: int,
    amount: Decimal,
    payment_method: str,
    organization_id: int,
    created_by_user_id: int,
    auth_header: str
):

    amount = Decimal(str(amount))

    invoice_data = fetch_invoice(invoice_id, auth_header)

    if invoice_data["status"] == "CANCELLED":
        raise ConflictException("Cannot pay a cancelled invoice")

    if invoice_data["status"] == "PAID":
        raise ConflictException("Invoice already fully paid")

    if amount <= Decimal("0.00"):
        raise ConflictException("Payment amount must be greater than zero")

    invoice_total = Decimal(str(invoice_data["total"]))

    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.invoice_id == invoice_id,
            Payment.organization_id == organization_id
        )
        .scalar()
    )

    total_paid = Decimal(str(total_paid))

    if total_paid + amount > invoice_total:
        raise ConflictException("Payment exceeds invoice total")

    payment = Payment(
        organization_id=organization_id,
        invoice_id=invoice_id,
        amount=amount,
        payment_method=payment_method,
        created_by_user_id=created_by_user_id,
        paid_at=datetime.now(timezone.utc),
    )

    db.add(payment)
    db.flush()

    new_total_paid = total_paid + amount

    if new_total_paid == invoice_total:
        new_status = "PAID"
    else:
        new_status = "PARTIALLY_PAID"

    update_invoice_status(invoice_id, new_status, auth_header)

    db.commit()
    db.refresh(payment)

    return payment


# -----------------------------
# GET PAYMENTS FOR INVOICE
# -----------------------------
def get_payments_for_invoice(db: Session, invoice_id: int, organization_id: int, auth_header: str):

    fetch_invoice(invoice_id, auth_header)

    payments = (
        db.query(Payment)
        .filter(
            Payment.invoice_id == invoice_id,
            Payment.organization_id == organization_id
        )
        .order_by(Payment.paid_at.asc())
        .all()
    )

    return payments


# -----------------------------
# REFUND
# -----------------------------
def refund_invoice(db: Session, invoice_id: int, organization_id: int, auth_header: str):

    invoice_data = fetch_invoice(invoice_id, auth_header)

    if invoice_data["status"] != "PAID":
        raise ConflictException("Refund allowed only for fully paid invoices")

    invoice_total = Decimal(str(invoice_data["total"]))

    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(
            Payment.invoice_id == invoice_id,
            Payment.organization_id == organization_id
        )
        .scalar()
    )

    total_paid = Decimal(str(total_paid))

    if total_paid != invoice_total:
        raise ConflictException("Invoice is not fully paid")

    update_invoice_status(invoice_id, "REFUNDED", auth_header)

    return {
        "invoice_id": invoice_id,
        "status": "REFUNDED"
    }