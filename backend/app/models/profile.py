from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from sqlalchemy.sql import func
from backend.app.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    headline = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)
    
    summary = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True) # list of string tags
    experiences = Column(JSON, nullable=True) # list of dicts: company, role, period, location, bullets
    educations = Column(JSON, nullable=True) # list of dicts: institution, degree, period, notes
    certifications = Column(JSON, nullable=True) # list of dicts
    verified_facts = Column(JSON, nullable=True) # list of audit points to prevent hallucinations
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
