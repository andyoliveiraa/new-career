from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.sql import func
from backend.app.database import Base

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    engine = Column(String(50), nullable=False, index=True)
    query = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    total_found = Column(Integer, default=0)
    total_new = Column(Integer, default=0)
    total_discarded = Column(Integer, default=0)
    status = Column(String(50), default="completed") # running, completed, failed
    duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
