from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True)

    organization_user_id = Column(
        Integer,
        ForeignKey("organization_users.id"),
        nullable=False
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False
    )