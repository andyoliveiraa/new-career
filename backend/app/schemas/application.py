from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None # 'disponivel', 'avaliada', 'em_preparacao', 'candidatado', 'entrevista', 'positiva', 'negativa', 'descartada'
    notes: Optional[str] = None
    feedback_notes: Optional[str] = None
    custom_cv_text: Optional[str] = None
    custom_cover_letter: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    job_id: int
    status: str
    match_score: Optional[float] = None
    match_summary: Optional[str] = None
    pros: Optional[str] = None
    gaps: Optional[str] = None
    applied_at: Optional[datetime] = None
    custom_cv_path: Optional[str] = None
    custom_cover_letter: Optional[str] = None
    custom_cv_text: Optional[str] = None
    notes: Optional[str] = None
    feedback_received_at: Optional[datetime] = None
    feedback_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
