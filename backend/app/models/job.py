from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON
from sqlalchemy.sql import func
from backend.app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_key = Column(String(255), unique=True, index=True, nullable=False) # Hash or normalized unique key
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    is_remote = Column(Boolean, default=False)
    salary = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    url = Column(Text, nullable=False)
    source = Column(String(50), nullable=False, index=True) # netempregos, google, linkedin, indeed, greenhouse, lever, ashby, workday
    
    # Liveness check fields
    liveness_status = Column(String(20), default="unknown", index=True) # active, expired, uncertain, unknown
    liveness_checked_at = Column(DateTime(timezone=True), nullable=True)
    liveness_reason = Column(String(255), nullable=True)
    
    # Distance / Geo
    distance_km = Column(Float, nullable=True)
    
    # Extra data (raw attributes)
    raw_metadata = Column(JSON, nullable=True)
    
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
