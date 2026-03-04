from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True)

    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False
    )

    permission_id = Column(
        Integer,
        ForeignKey("permissions.id"),
        nullable=False
    )