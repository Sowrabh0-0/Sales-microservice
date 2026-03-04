from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    organization_name: str = Field(..., min_length=2, max_length=150)
    organization_slug: str = Field(..., min_length=2, max_length=100, pattern="^[a-z0-9-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    organization_slug: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    user_id: int
    email: EmailStr
    org_id: int
    permissions: list[str]


class RefreshTokenRequest(BaseModel):
    refresh_token: str