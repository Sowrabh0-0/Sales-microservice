from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.exceptions.custom_exceptions import NotFoundException, ConflictException


def create_customer_service(
    db: Session,
    name: str,
    email: str,
    organization_id: int,
    created_by_user_id: int
) -> Customer:

    customer = Customer(
        organization_id=organization_id,
        name=name,
        email=email,
        created_by_user_id=created_by_user_id,
        created_at=datetime.now(timezone.utc),
    )

    db.add(customer)

    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise ConflictException("Customer email already exists")


def get_customer(db: Session, customer_id: int, organization_id: int) -> Customer:

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.organization_id == organization_id
        )
        .first()
    )

    if not customer:
        raise NotFoundException("Customer not found")

    return customer


def list_customers_service(
    db: Session,
    organization_id: int,
    offset: int = 0,
    limit: int = 15
):

    return (
        db.query(Customer)
        .filter(Customer.organization_id == organization_id)
        .order_by(Customer.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def update_customer(
    db: Session,
    customer_id: int,
    organization_id: int,
    name: str,
    email: str
):

    customer = get_customer(db, customer_id, organization_id)

    customer.name = name
    customer.email = email

    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise ConflictException("Email already exists")


def customer_exists(
    db: Session,
    customer_id: int,
    organization_id: int
) -> bool:

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.organization_id == organization_id
        )
        .first()
    )

    return customer is not None