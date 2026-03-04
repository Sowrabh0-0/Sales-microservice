from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(150), nullable=False)

    # used for unique company identifier
    slug = Column(String(100), unique=True, nullable=False, index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=datetime.now(timezone.utc)
    )