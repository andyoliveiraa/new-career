from backend.app.schemas.job import JobCreate, JobResponse, JobFilter
from backend.app.schemas.application import ApplicationUpdate, ApplicationResponse
from backend.app.schemas.profile import ProfileBase, ProfileUpdate, ProfileResponse
from backend.app.schemas.ai import (
    JDAnalysisRequest, JDAnalysisResponse,
    CVTailorRequest, CVTailorResponse,
    CoverLetterRequest, CoverLetterResponse,
    InterviewPrepResponse
)

__all__ = [
    "JobCreate", "JobResponse", "JobFilter",
    "ApplicationUpdate", "ApplicationResponse",
    "ProfileBase", "ProfileUpdate", "ProfileResponse",
    "JDAnalysisRequest", "JDAnalysisResponse",
    "CVTailorRequest", "CVTailorResponse",
    "CoverLetterRequest", "CoverLetterResponse",
    "InterviewPrepResponse"
]
