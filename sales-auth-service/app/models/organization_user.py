from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class OrganizationUser(Base):
    __tablename__ = "organization_users"

    id = Column(Integer, primary_key=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )