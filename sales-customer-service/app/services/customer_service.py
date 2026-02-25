from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models.customer import Customer

def create_customer_service(db: Session, name: str, email: str) -> Customer:
    customer = Customer(
        name=name,
        email=email,
        created_at=datetime.now(timezone.utc),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if not customer:
        raise ValueError("Customer not found")
    return customer

def list_customers_service(db: Session, offset: int = 0, limit: int = 15):
    return (
        db.query(Customer)
        .order_by(Customer.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

def update_customer(db: Session, customer_id: int, name: str, email: str):
    customer = get_customer(db, customer_id)
    customer.name = name
    customer.email = email

    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise ValueError("Email already exists")