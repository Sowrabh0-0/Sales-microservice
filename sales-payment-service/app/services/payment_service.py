from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
import requests
import os

from app.models.payment import Payment

INVOICE_SERVICE_URL = os.getenv("INVOICE_SERVICE_URL")


# -----------------------------
# FETCH INVOICE FROM INVOICE SERVICE
# -----------------------------
def fetch_invoice(invoice_id: int):
    response = requests.get(
        f"{INVOICE_SERVICE_URL}/invoices/{invoice_id}"
    )

    if response.status_code != 200:
        raise ValueError("Invoice not found")

    return response.json()


# -----------------------------
# UPDATE INVOICE STATUS VIA API
# -----------------------------
def update_invoice_status(invoice_id: int, status: str):
    response = requests.post(
        f"{INVOICE_SERVICE_URL}/invoices/{invoice_id}/status",
        json={"status": status},
    )

    if response.status_code not in (200, 201):
        raise ValueError("Failed to update invoice status")


# -----------------------------
# CREATE PAYMENT
# -----------------------------
def create_payment(
    db: Session,
    invoice_id: int,
    amount: Decimal,
    payment_method: str,
):

    amount = Decimal(str(amount))

    # 1️⃣ Validate invoice via Invoice Service
    invoice_data = fetch_invoice(invoice_id)

    if invoice_data["status"] == "CANCELLED":
        raise ValueError("Cannot pay a cancelled invoice")

    if invoice_data["status"] == "PAID":
        raise ValueError("Invoice already fully paid")

    if amount <= Decimal("0.00"):
        raise ValueError("Payment amount must be greater than zero")

    invoice_total = Decimal(str(invoice_data["total"]))

    # 2️⃣ Calculate total paid so far (inside Payment DB only)
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.invoice_id == invoice_id)
        .scalar()
    )

    total_paid = Decimal(str(total_paid))

    # 3️⃣ Prevent overpayment
    if total_paid + amount > invoice_total:
        raise ValueError("Payment exceeds invoice total")

    # 4️⃣ Create payment (but don't finalize yet)
    payment = Payment(
        invoice_id=invoice_id,
        amount=amount,
        payment_method=payment_method,
        paid_at=datetime.now(timezone.utc),
    )

    db.add(payment)
    db.flush()  # generate ID but don't commit yet

    # 5️⃣ Determine new invoice status
    new_total_paid = total_paid + amount

    if new_total_paid == invoice_total:
        new_status = "PAID"
    else:
        new_status = "PARTIALLY_PAID"

    # 6️⃣ Update invoice status via Invoice Service
    update_invoice_status(invoice_id, new_status)

    # 7️⃣ Commit only after invoice update succeeds
    db.commit()
    db.refresh(payment)

    return payment


# -----------------------------
# GET PAYMENTS FOR INVOICE
# -----------------------------
def get_payments_for_invoice(db: Session, invoice_id: int):

    # Validate invoice exists
    fetch_invoice(invoice_id)

    payments = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .order_by(Payment.paid_at.asc())
        .all()
    )

    return payments


# REFUND 

def refund_invoice(db: Session, invoice_id: int):

    # 1️⃣ Fetch invoice via HTTP
    invoice_data = fetch_invoice(invoice_id)

    if invoice_data["status"] != "PAID":
        raise ValueError("Refund allowed only for fully paid invoices")

    invoice_total = Decimal(str(invoice_data["total"]))

    # 2️⃣ Validate payments exist
    total_paid = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.invoice_id == invoice_id)
        .scalar()
    )

    total_paid = Decimal(str(total_paid))

    if total_paid != invoice_total:
        raise ValueError("Invoice is not fully paid")

    # 3️⃣ Update invoice status via Invoice Service
    update_invoice_status(invoice_id, "REFUNDED")

    return {
        "invoice_id": invoice_id,
        "status": "REFUNDED",
    }