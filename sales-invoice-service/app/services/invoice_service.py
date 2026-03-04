from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
import os

from app.models.invoice import Invoice
from app.exceptions.custom_exceptions import NotFoundException, ConflictException
from app.utils.service_client import authenticated_get

ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL")

TAX_RATE = Decimal("0.18")


# -----------------------------
# FETCH ORDER
# -----------------------------
def fetch_order(order_id: int, auth_header: str):

    response = authenticated_get(
        f"{ORDER_SERVICE_URL}/orders/{order_id}",
        auth_header
    )

    if response.status_code != 200:
        raise NotFoundException("Order not found")

    return response.json()


# -----------------------------
# CREATE INVOICE
# -----------------------------
def create_invoice(
    db: Session,
    order_id: int,
    organization_id: int,
    created_by_user_id: int,
    auth_header: str,
    discount_type: str | None = None,
    discount_value: Decimal = Decimal("0.00"),
):

    order_data = fetch_order(order_id, auth_header)

    if order_data["status"] != "CONFIRMED":
        raise ConflictException("Invoice can be created only for CONFIRMED orders")

    existing = db.query(Invoice).filter(
        Invoice.order_id == order_id,
        Invoice.organization_id == organization_id
    ).first()

    if existing:
        raise ConflictException("Invoice already exists for this order")

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
        raise ConflictException("Discount cannot exceed subtotal")

    total = (subtotal + tax - discount_amount).quantize(Decimal("0.01"))

    invoice = Invoice(
        organization_id=organization_id,
        order_id=order_id,
        subtotal=subtotal,
        tax=tax,
        total=total,
        discount_type=discount_type,
        discount_value=discount_value,
        status="UNPAID",
        due_date=(datetime.now(timezone.utc) + timedelta(days=30)).date(),
        created_by_user_id=created_by_user_id,
        created_at=datetime.now(timezone.utc),
    )

    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return invoice


# -----------------------------
# GET INVOICE
# -----------------------------
def get_invoice(db: Session, invoice_id: int, organization_id: int):

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.organization_id == organization_id
        )
        .first()
    )

    if not invoice:
        raise NotFoundException("Invoice not found")

    return invoice


# -----------------------------
# LIST INVOICES
# -----------------------------
def list_invoices(db: Session, organization_id, status=None, order_id=None):

    query = db.query(Invoice).filter(
        Invoice.organization_id == organization_id
    )

    if status:
        query = query.filter(Invoice.status == status)

    if order_id:
        query = query.filter(Invoice.order_id == order_id)

    return query.order_by(Invoice.id.desc()).all()


# -----------------------------
# CANCEL INVOICE
# -----------------------------
def cancel_invoice(db: Session, invoice_id: int, organization_id: int):

    invoice = get_invoice(db, invoice_id, organization_id)

    if invoice.status != "UNPAID":
        raise ConflictException("Only unpaid invoices can be cancelled")

    invoice.status = "CANCELLED"
    db.commit()
    db.refresh(invoice)

    return invoice


# -----------------------------
# UPDATE STATUS (called by payment-service)
# -----------------------------
def update_invoice_status(db: Session, invoice_id: int, organization_id: int, status: str):

    invoice = get_invoice(db, invoice_id, organization_id)

    invoice.status = status

    db.commit()
    db.refresh(invoice)

    return invoice