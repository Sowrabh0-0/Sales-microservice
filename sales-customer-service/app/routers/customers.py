from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services.customer_service import (
    create_customer_service,
    get_customer,
    list_customers_service,
    update_customer,
    customer_exists
)

from app.dependencies.permissions import require_permission
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post(
    "/create-customer",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED
)
def create_customer_api(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("customer.create"))
):

    return create_customer_service(
        db=db,
        name=data.name,
        email=data.email,
        organization_id=current_user.org_id,
        created_by_user_id=current_user.user_id
    )


@router.get("/", response_model=list[CustomerResponse])
def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("customer.read"))
):

    offset = (page - 1) * limit

    return list_customers_service(
        db,
        organization_id=current_user.org_id,
        offset=offset,
        limit=limit
    )


@router.get("/{customer_id}/exists")
def customer_exists_api(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    return {
        "exists": customer_exists(
            db,
            customer_id,
            current_user.org_id
        )
    }


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer_api(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("customer.read"))
):

    return get_customer(
        db,
        customer_id,
        current_user.org_id
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer_api(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_permission("customer.update"))
):

    return update_customer(
        db=db,
        customer_id=customer_id,
        organization_id=current_user.org_id,
        name=payload.name,
        email=payload.email
    )