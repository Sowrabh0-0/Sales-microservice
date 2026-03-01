from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
import requests
import os

from app.models.invoice import Invoice

ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL")

TAX_RATE = Decimal("0.18")


def fetch_order(order_id: int):
    response = requests.get(
        f"{ORDER_SERVICE_URL}/orders/{order_id}"
    )

    if response.status_code != 200:
        raise ValueError("Order not found")

    return response.json()


def create_invoice(
    db: Session,
    order_id: int,
    discount_type: str | None = None,
    discount_value: Decimal = Decimal("0.00"),
):

    order_data = fetch_order(order_id)

    if order_data["status"] != "CONFIRMED":
        raise ValueError("Invoice can be created only for CONFIRMED orders")

    # Check if invoice already exists
    existing = db.query(Invoice).filter(
        Invoice.order_id == order_id
    ).first()

    if existing:
        raise ValueError("Invoice already exists for this order")

    # Subtotal from order items
    subtotal = sum(
        Decimal(item["quantity"]) * Decimal(item["unit_price"])
        for item in order_data["items"]
    ).quantize(Decimal("0.01"))

    tax = (subtotal * TAX_RATE).quantize(Decimal("0.01"))

    discount_amount = Decimal("0.00")

    if discount_type == "FLAT":
        discount_amount = discount_value

    elif discount_type == "PERCENT":
        discount_amount = (
            subtotal * discount_value / Decimal("100")
        ).quantize(Decimal("0.01"))

    if discount_amount > subtotal:
        raise ValueError("Discount cannot exceed subtotal")

    total = (subtotal + tax - discount_amount).quantize(Decimal("0.01"))

    invoice = Invoice(
        order_id=order_id,
        subtotal=subtotal,
        tax=tax,
        total=total,
        discount_type=discount_type,
        discount_value=discount_value,
        status="UNPAID",
        due_date=(datetime.now(timezone.utc) + timedelta(days=30)).date(),
        created_at=datetime.now(timezone.utc),
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return invoice


def get_invoice(db: Session, invoice_id: int):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise ValueError("Invoice not found")
    return invoice


def list_invoices(db: Session, status=None, order_id=None):
    query = db.query(Invoice)

    if status:
        query = query.filter(Invoice.status == status)

    if order_id:
        query = query.filter(Invoice.order_id == order_id)

    return query.order_by(Invoice.id.desc()).all()


def cancel_invoice(db: Session, invoice_id: int):
    invoice = get_invoice(db, invoice_id)

    ALLOWED_CANCEL_STATUSES = ["UNPAID"]

    if invoice.status not in ALLOWED_CANCEL_STATUSES:
        raise ValueError("Only unpaid invoices can be cancelled")
        
    invoice.status = "CANCELLED"
    db.commit()
    db.refresh(invoice)

    return invoice


# --- Service for updating invoice status, called by payment service after payment creation ---

def update_invoice_status(db: Session, invoice_id: int, status: str):
    invoice = db.get(Invoice, invoice_id)

    if not invoice:
        raise ValueError("Invoice not found")

    invoice.status = status
    db.commit()
    db.refresh(invoice)

    return invoice