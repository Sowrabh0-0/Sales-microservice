from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import requests
import os

from app.models.order import Order
from app.models.order_item import OrderItem

CUSTOMER_SERVICE_URL = os.getenv("CUSTOMER_SERVICE_URL")


def validate_customer(customer_id: int):
    response = requests.get(
        f"{CUSTOMER_SERVICE_URL}/customers/{customer_id}"
    )
    if response.status_code != 200:
        raise ValueError("Customer not found")


# -----------------------------
# CREATE ORDER
# -----------------------------
def create_order(db: Session, customer_id: int, items: list) -> Order:

    validate_customer(customer_id)

    order = Order(
        customer_id=customer_id,
        status="CREATED",
        created_at=datetime.now(timezone.utc),
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    for item in items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_name=item["product_name"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            )
        )

    db.commit()

    return get_order(db, order.id)


# -----------------------------
# GET ORDER
# -----------------------------
def get_order(db: Session, order_id: int) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise ValueError("Order not found")

    items = db.query(OrderItem).filter(
        OrderItem.order_id == order.id
    ).all()

    order.items = items
    order.total = sum(
        item.quantity * item.unit_price
        for item in items
    )

    return order


# -----------------------------
# LIST ORDERS
# -----------------------------
def list_orders(db: Session, offset=0, limit=15, status=None, customer_id=None):

    query = db.query(Order)

    if status:
        query = query.filter(Order.status == status)

    if customer_id:
        query = query.filter(Order.customer_id == customer_id)

    orders = (
        query.order_by(Order.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    for order in orders:
        items = db.query(OrderItem).filter(
            OrderItem.order_id == order.id
        ).all()

        order.items = items
        order.total = sum(
            item.quantity * item.unit_price
            for item in items
        )

    return orders


# -----------------------------
# CONFIRM ORDER
# -----------------------------
def confirm_order(db: Session, order_id: int):

    order = get_order(db, order_id)

    if order.status != "CREATED":
        raise ValueError("Only CREATED orders can be confirmed")

    order.status = "CONFIRMED"
    db.commit()
    db.refresh(order)

    return order


# -----------------------------
# CANCEL ORDER
# -----------------------------
def cancel_order(db: Session, order_id: int):

    order = get_order(db, order_id)

    if order.status == "CONFIRMED":
        raise ValueError("Confirmed orders cannot be cancelled")

    order.status = "CANCELLED"
    db.commit()
    db.refresh(order)

    return order