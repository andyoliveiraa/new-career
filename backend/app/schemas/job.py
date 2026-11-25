from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class JobBase(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    is_remote: bool = False
    salary: Optional[str] = None
    description: Optional[str] = None
    url: str
    source: str
    published_at: Optional[datetime] = None


class JobCreate(JobBase):
    job_key: str
    raw_metadata: Optional[Dict[str, Any]] = None


class ManualJobCreate(BaseModel):
    url: str = Field(..., min_length=5, description="URL da vaga")
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    salary: Optional[str] = None
    description: Optional[str] = None
    source: str = "manual"


class BatchLivenessRequest(BaseModel):
    job_ids: Optional[List[int]] = None
    only_non_expired: bool = True
    limit: int = Field(default=20, ge=1, le=50)


class JobResponse(JobBase):
    id: int
    job_key: str
    liveness_status: str
    liveness_checked_at: Optional[datetime] = None
    liveness_reason: Optional[str] = None
    distance_km: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    # Application state if linked
    application_status: Optional[str] = None
    match_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class JobFilter(BaseModel):
    query: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    liveness: Optional[str] = None
    is_remote: Optional[bool] = None
    max_distance: Optional[float] = None
    limit: int = 50
    offset: int = 0
