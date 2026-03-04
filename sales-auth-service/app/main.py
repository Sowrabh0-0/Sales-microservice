import os
from fastapi import FastAPI
from app.routers.auth import router as auth_router
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.exceptions.handlers import (
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)

from app.exceptions.custom_exceptions import AppException


if os.getenv("ENVIRONMENT") == "production":
    docs_url = None
    redoc_url = None
    openapi_url = None
else:
    docs_url = "/auth/docs"
    redoc_url = "/auth/redoc"
    openapi_url = "/auth/openapi.json"

app = FastAPI(
    title="Authentication Service",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
)

# Register exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth_router)