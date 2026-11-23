from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Status: 'disponivel', 'avaliada', 'em_preparacao', 'candidatado', 'entrevista', 'positiva', 'negativa', 'descartada'
    status = Column(String(50), default="disponivel", index=True, nullable=False)
    
    # Match analysis
    match_score = Column(Float, nullable=True) # 0 to 100
    match_summary = Column(Text, nullable=True)
    pros = Column(Text, nullable=True)
    gaps = Column(Text, nullable=True)
    
    # Application execution details
    applied_at = Column(DateTime(timezone=True), nullable=True)
    custom_cv_path = Column(String(500), nullable=True)
    custom_cover_letter = Column(Text, nullable=True)
    custom_cv_text = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Feedback & outcomes
    feedback_received_at = Column(DateTime(timezone=True), nullable=True)
    feedback_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    job = relationship("Job", backref="application", uselist=False)
