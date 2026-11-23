from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, Optional
import os

from backend.app.database import get_db
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.profile import Profile
from backend.app.schemas.ai import (
    JDAnalysisResponse, CVTailorRequest, CVTailorResponse,
    CoverLetterRequest, CoverLetterResponse, InterviewPrepResponse
)
from backend.app.services.ai_tailor import AITailorService
from backend.app.services.pdf_generator import PDFGeneratorService
from backend.app.scrapers.netempregos import NetEmpregosScraper

router = APIRouter(prefix="/ai", tags=["AI Career Studio"])

async def _get_profile_dict(db: AsyncSession) -> Dict[str, Any]:
    stmt = select(Profile).limit(1)
    res = await db.execute(stmt)
    prof = res.scalar_one_or_none()
    if not prof:
        from backend.app.api.profile import DEFAULT_PROFILE
        return DEFAULT_PROFILE
    return {
        "full_name": prof.full_name,
        "headline": prof.headline,
        "email": prof.email,
        "phone": prof.phone,
        "location": prof.location,
        "linkedin_url": prof.linkedin_url,
        "github_url": prof.github_url,
        "summary": prof.summary,
        "skills": prof.skills or [],
        "experiences": prof.experiences or [],
        "educations": prof.educations or [],
        "verified_facts": prof.verified_facts or []
    }

async def _ensure_job_description(job: Job):
    """If Net-Empregos job has no description yet, fetch it on the fly."""
    if not job.description and "net-empregos.com" in job.url:
        scraper = NetEmpregosScraper()
        desc = await scraper.fetch_job_description(job.url)
        if desc:
            job.description = desc

@router.post("/analyze/{job_id}", response_model=JDAnalysisResponse)
async def analyze_job(job_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    await _ensure_job_description(job)
    profile_dict = await _get_profile_dict(db)

    job_dict = {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description
    }

    analysis = await AITailorService.analyze_fit(job_dict, profile_dict)
    
    # Save match score in application
    app_stmt = select(Application).where(Application.job_id == job_id)
    app = (await db.execute(app_stmt)).scalar_one_or_none()
    if app:
        app.match_score = float(analysis.get("match_score", 85.0))
        app.match_summary = analysis.get("summary")
        app.pros = "\n".join(analysis.get("strengths", []))
        app.gaps = "\n".join(analysis.get("gaps", []))
        if app.status == "disponivel":
            app.status = "avaliada"
        await db.commit()

    return JDAnalysisResponse(
        job_id=job.id,
        match_score=float(analysis.get("match_score", 85.0)),
        summary=analysis.get("summary", ""),
        strengths=analysis.get("strengths", []),
        gaps=analysis.get("gaps", []),
        keywords=analysis.get("keywords", []),
        recommendation=analysis.get("recommendation", "")
    )

@router.post("/tailor-cv", response_model=CVTailorResponse)
async def tailor_cv(request: CVTailorRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == request.job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    await _ensure_job_description(job)
    profile_dict = await _get_profile_dict(db)

    job_dict = {
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description
    }

    tailored = await AITailorService.tailor_cv(job_dict, profile_dict)
    
    # Generate ATS PDF
    html_content = PDFGeneratorService.render_html(
        profile_dict=profile_dict,
        tailored_summary=tailored.get("tailored_summary", ""),
        tailored_experiences=tailored.get("tailored_experiences", []),
        highlighted_skills=tailored.get("highlighted_skills", [])
    )

    pdf_filename = f"cv_job_{job.id}.pdf"
    pdf_path = os.path.join("./storage/cvs", pdf_filename)
    saved_path = await PDFGeneratorService.generate_pdf(html_content, pdf_path)

    # Save to application
    app_stmt = select(Application).where(Application.job_id == job.id)
    app = (await db.execute(app_stmt)).scalar_one_or_none()
    if app:
        app.custom_cv_path = saved_path
        app.custom_cv_text = tailored.get("tailored_summary", "")
        if app.status in ("disponivel", "avaliada"):
            app.status = "em_preparacao"
        await db.commit()

    return CVTailorResponse(
        job_id=job.id,
        tailored_summary=tailored.get("tailored_summary", ""),
        tailored_experiences=tailored.get("tailored_experiences", []),
        highlighted_skills=tailored.get("highlighted_skills", []),
        pdf_download_url=f"/api/ai/download-pdf/{pdf_filename}"
    )

@router.post("/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter(request: CoverLetterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Job).where(Job.id == request.job_id)
    job = (await db.execute(stmt)).scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    await _ensure_job_description(job)
    profile_dict = await _get_profile_dict(db)

    job_dict = {
        "title": job.title,
        "company": job.company,
        "description": job.description
    }

    cl_res = await AITailorService.generate_cover_letter(job_dict, profile_dict, request.angle or "direct")

    # Save to application
    app_stmt = select(Application).where(Application.job_id == job.id)
    app = (await db.execute(app_stmt)).scalar_one_or_none()
    if app:
        app.custom_cover_letter = cl_res.get("cover_letter_text", "")
        await db.commit()

    return CoverLetterResponse(
        job_id=job.id,
        cover_letter_text=cl_res.get("cover_letter_text", ""),
        linkedin_note=cl_res.get("linkedin_note", "")
    )

@router.get("/download-pdf/{filename}")
async def download_pdf(filename: str):
    file_path = os.path.join("./storage/cvs", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename, media_type="application/pdf")
    html_fallback = file_path.replace(".pdf", ".html")
    if os.path.exists(html_fallback):
        return FileResponse(html_fallback, filename=filename.replace(".pdf", ".html"), media_type="text/html")
    raise HTTPException(status_code=404, detail="Ficheiro PDF não encontrado")
