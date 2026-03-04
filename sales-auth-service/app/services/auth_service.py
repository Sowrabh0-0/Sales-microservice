from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.user import User
from app.models.organization_user import OrganizationUser
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.permission import Permission
from app.models.role_permission import RolePermission

from app.security.password import hash_password, verify_password
from app.security.jwt import create_access_token

from app.exceptions.custom_exceptions import (
    NotFoundException,
    UnauthorizedException,
    ConflictException,
    ForbiddenException
)


def get_user_permissions(db: Session, organization_user_id: int):

    permissions = (
        db.query(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .filter(UserRole.organization_user_id == organization_user_id)
        .all()
    )

    return [p[0] for p in permissions]


# -------------------------
# Signup
# -------------------------

def signup(db: Session, org_name: str, org_slug: str, email: str, password: str):

    existing_org = db.query(Organization).filter(
        Organization.slug == org_slug
    ).first()

    if existing_org:
        raise ConflictException("Organization already exists")

    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        raise ConflictException("User already exists")

    organization = Organization(name=org_name, slug=org_slug)
    db.add(organization)
    db.flush()

    user = User(
        email=email,
        password_hash=hash_password(password),
    )

    db.add(user)
    db.flush()

    organization_user = OrganizationUser(
        organization_id=organization.id,
        user_id=user.id,
    )

    db.add(organization_user)
    db.flush()

    owner_role = db.query(Role).filter(Role.name == "OWNER").first()

    if not owner_role:
        raise NotFoundException("OWNER role not configured")

    user_role = UserRole(
        organization_user_id=organization_user.id,
        role_id=owner_role.id,
    )

    db.add(user_role)
    db.commit()

    permissions = get_user_permissions(db, organization_user.id)

    token = create_access_token({
        "user_id": user.id,
        "org_id": organization.id,
        "permissions": permissions
    })

    return token


# -------------------------
# Login
# -------------------------

def login(db: Session, org_slug: str, email: str, password: str):

    organization = db.query(Organization).filter(
        Organization.slug == org_slug
    ).first()

    if not organization:
        raise NotFoundException("Organization not found")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise UnauthorizedException("Invalid credentials")

    if not verify_password(password, user.password_hash):
        raise UnauthorizedException("Invalid credentials")

    organization_user = db.query(OrganizationUser).filter(
        OrganizationUser.organization_id == organization.id,
        OrganizationUser.user_id == user.id,
    ).first()

    if not organization_user:
        raise ForbiddenException("User not part of this organization")

    permissions = get_user_permissions(db, organization_user.id)

    token = create_access_token({
        "user_id": user.id,
        "org_id": organization.id,
        "permissions": permissions
    })

    return token