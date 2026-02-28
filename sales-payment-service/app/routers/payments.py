from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import PaymentCreate, PaymentResponse
from app.services.payment_service import (
    create_payment,
    get_payments_for_invoice,
    refund_invoice
)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment_api(payload: PaymentCreate, db: Session = Depends(get_db)):
    try:
        return create_payment(
            db=db,
            invoice_id=payload.invoice_id,
            amount=payload.amount,
            payment_method=payload.payment_method,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoice/{invoice_id}", response_model=list[PaymentResponse])
def get_payments_for_invoice_api(invoice_id: int, db: Session = Depends(get_db)):
    try:
        return get_payments_for_invoice(db, invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    

@router.post("/refund/{invoice_id}")
def refund_invoice_api(invoice_id: int, db: Session = Depends(get_db)):
    try:
        return refund_invoice(db, invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))