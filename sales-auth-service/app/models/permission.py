from sqlalchemy import Column, Integer, String
from app.database import Base


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True)

    name = Column(String(100), unique=True, nullable=False)