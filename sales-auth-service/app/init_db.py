from app.database import engine, Base, SessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.organization_user import OrganizationUser
from app.models.role_permission import RolePermission
from app.models.user_role import UserRole
from app.models.refresh_token import RefreshToken


def create_tables():
    Base.metadata.create_all(bind=engine)


def seed_roles_and_permissions():
    db = SessionLocal()

    try:
        roles = ["OWNER", "ADMIN", "SALES", "ACCOUNTANT"]

        for role_name in roles:
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                db.add(Role(name=role_name))

        permissions = [
            "customer.create",
            "customer.read",
            "customer.update",
            "customer.delete",

            "order.create",
            "order.read",
            "order.update",
            "order.confirm",
            "order.cancel",


            "invoice.create",
            "invoice.read",
            "invoice.update",
            "invoice.cancel",

            "payment.create",
            "payment.read",
            "payment.refund",
        ]

        for perm in permissions:
            permission = db.query(Permission).filter(Permission.name == perm).first()
            if not permission:
                db.add(Permission(name=perm))

        db.commit()

    finally:
        db.close()


def init_db():
    create_tables()
    seed_roles_and_permissions()


if __name__ == "__main__":
    init_db()