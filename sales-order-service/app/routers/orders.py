from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import OrderCreate, OrderResponse, OrderUpdate
from app.services.order_service import (
    create_order,
    confirm_order,
    get_order,
    cancel_order,
    list_orders,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order_api(data: OrderCreate, db: Session = Depends(get_db)):
    try:
        return create_order(
            db=db,
            customer_id=data.customer_id,
            items=[item.model_dump() for item in data.items],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{order_id}", response_model=OrderResponse)
def get_order_api(order_id: int, db: Session = Depends(get_db)):
    try:
        return get_order(db, order_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/", response_model=list[OrderResponse])
def list_orders_api(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    status: str | None = None,
    customer_id: int | None = None,
    db: Session = Depends(get_db),
):
    offset = (page - 1) * limit
    return list_orders(db, offset, limit, status, customer_id)


@router.post("/{order_id}/confirm", response_model=OrderResponse)
def confirm_order_api(order_id: int, db: Session = Depends(get_db)):
    return confirm_order(db, order_id)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order_api(order_id: int, db: Session = Depends(get_db)):
    return cancel_order(db, order_id)