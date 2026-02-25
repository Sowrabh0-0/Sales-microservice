from pydantic import BaseModel, ConfigDict, Field, EmailStr
from datetime import datetime

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

class CustomerResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CustomerUpdate(BaseModel):
    name: str
    email: EmailStr