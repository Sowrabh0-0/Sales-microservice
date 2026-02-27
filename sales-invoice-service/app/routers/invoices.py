from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from app.database import get_db
from app.schemas import InvoiceResponse, InvoiceStatusUpdate
from app.services.invoice_service import (
    create_invoice,
    get_invoice,
    list_invoices,
    cancel_invoice,
    update_invoice_status
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.post("/orders/{order_id}", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice_api(order_id: int, db: Session = Depends(get_db)):
    try:
        return create_invoice(db=db, order_id=order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_api(invoice_id: int, db: Session = Depends(get_db)):
    try:
        return get_invoice(db, invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/", response_model=list[InvoiceResponse])
def list_invoice_api(status: str | None = None, order_id: int | None = None, db: Session = Depends(get_db)):
    return list_invoices(db, status, order_id)


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice_api(invoice_id: int, db: Session = Depends(get_db)):
    return cancel_invoice(db, invoice_id)


@router.post("/{invoice_id}/status")
def update_invoice_status_api(
    invoice_id: int,
    payload: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_invoice_status(
            db,
            invoice_id,
            payload.status
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))