from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
import os

from backend.app.firebase import firebase_manager
from backend.app.schemas.ai import (
    JDAnalysisResponse, CVTailorRequest, CVTailorResponse,
    CoverLetterRequest, CoverLetterResponse
)
from backend.app.services.ai_tailor import AITailorService
from backend.app.services.pdf_generator import PDFGeneratorService
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.auth_utils import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Career Studio"])

async def _ensure_job_description(user_id: str, job: Dict[str, Any]):
    if not job.get("description") and "net-empregos.com" in job.get("url", ""):
        scraper = NetEmpregosScraper()
        desc = await scraper.fetch_job_description(job["url"])
        if desc:
            job["description"] = desc
            await firebase_manager.save_job(user_id, job)

@router.post("/analyze/{job_id}", response_model=JDAnalysisResponse)
async def analyze_job(job_id: int, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    job = await firebase_manager.get_job(user_id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")

    await _ensure_job_description(user_id, job)
    profile_dict = await firebase_manager.get_profile(user_id)

    job_dict = {
        "title": job.get("title"),
        "company": job.get("company"),
        "location": job.get("location"),
        "description": job.get("description")
    }

    user_settings = await firebase_manager.get_user_settings(user_id)
    analysis = await AITailorService.analyze_fit(job_dict, profile_dict, user_keys=user_settings)

    # Save to application
    app = await firebase_manager.get_application(user_id, job_id) or {}
    app["match_score"] = float(analysis.get("match_score", 85.0))
    app["match_summary"] = analysis.get("summary")
    app["pros"] = "\n".join(analysis.get("strengths", []))
    app["gaps"] = "\n".join(analysis.get("gaps", []))
    if app.get("status") == "disponivel":
        app["status"] = "avaliada"
    await firebase_manager.save_application(user_id, job_id, app)

    return JDAnalysisResponse(
        job_id=job_id,
        match_score=float(analysis.get("match_score", 85.0)),
        summary=analysis.get("summary", ""),
        strengths=analysis.get("strengths", []),
        gaps=analysis.get("gaps", []),
        keywords=analysis.get("keywords", []),
        recommendation=analysis.get("recommendation", "")
    )

@router.post("/tailor-cv", response_model=CVTailorResponse)
async def tailor_cv(request: CVTailorRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    job = await firebase_manager.get_job(user_id, request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")

    await _ensure_job_description(user_id, job)
    profile_dict = await firebase_manager.get_profile(user_id)

    job_dict = {
        "title": job.get("title"),
        "company": job.get("company"),
        "location": job.get("location"),
        "description": job.get("description")
    }

    user_settings = await firebase_manager.get_user_settings(user_id)
    tailored = await AITailorService.tailor_cv(job_dict, profile_dict, user_keys=user_settings)

    # Resolve CV template config
    template_config = None
    if request.template_id:
        template_config = await firebase_manager.get_cv_template(user_id, request.template_id)
    if not template_config:
        templates = await firebase_manager.list_cv_templates(user_id)
        default_tpl = next((t for t in templates if t.get("is_default")), None)
        template_config = default_tpl or (templates[0] if templates else None)

    html_content = PDFGeneratorService.render_html(
        profile_dict=profile_dict,
        tailored_summary=tailored.get("tailored_summary", ""),
        tailored_experiences=tailored.get("tailored_experiences", []),
        highlighted_skills=tailored.get("highlighted_skills", []),
        template_config=template_config
    )

    pdf_filename = f"cv_job_{request.job_id}.pdf"
    user_cv_dir = os.path.join("./storage/users", user_id, "cvs")
    os.makedirs(user_cv_dir, exist_ok=True)
    pdf_path = os.path.join(user_cv_dir, pdf_filename)
    await PDFGeneratorService.generate_pdf(html_content, pdf_path)

    app = await firebase_manager.get_application(user_id, request.job_id) or {}
    app["custom_cv_path"] = f"/api/ai/download-pdf/{pdf_filename}?user_id={user_id}"
    app["custom_cv_text"] = tailored.get("tailored_summary", "")
    if app.get("status") in ("disponivel", "avaliada"):
        app["status"] = "em_preparacao"
    await firebase_manager.save_application(user_id, request.job_id, app)

    return CVTailorResponse(
        job_id=request.job_id,
        tailored_summary=tailored.get("tailored_summary", ""),
        tailored_experiences=tailored.get("tailored_experiences", []),
        highlighted_skills=tailored.get("highlighted_skills", []),
        pdf_download_url=f"/api/ai/download-pdf/{pdf_filename}?user_id={user_id}"
    )

@router.post("/cover-letter", response_model=CoverLetterResponse)
async def generate_cover_letter(request: CoverLetterRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    job = await firebase_manager.get_job(user_id, request.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Vaga não encontrada no Firebase")

    await _ensure_job_description(user_id, job)
    profile_dict = await firebase_manager.get_profile(user_id)

    job_dict = {
        "title": job.get("title"),
        "company": job.get("company"),
        "description": job.get("description")
    }

    user_settings = await firebase_manager.get_user_settings(user_id)
    cl_res = await AITailorService.generate_cover_letter(job_dict, profile_dict, request.angle or "direct", user_keys=user_settings)

    app = await firebase_manager.get_application(user_id, request.job_id) or {}
    app["custom_cover_letter"] = cl_res.get("cover_letter_text", "")
    await firebase_manager.save_application(user_id, request.job_id, app)

    return CoverLetterResponse(
        job_id=request.job_id,
        cover_letter_text=cl_res.get("cover_letter_text", ""),
        linkedin_note=cl_res.get("linkedin_note", "")
    )

@router.get("/download-pdf/{filename}")
async def download_pdf(filename: str, user_id: Optional[str] = None):
    # Check user storage first
    if user_id:
        user_path = os.path.join("./storage/users", user_id, "cvs", filename)
        if os.path.exists(user_path):
            return FileResponse(user_path, filename=filename, media_type="application/pdf")

    # Global storage fallback
    file_path = os.path.join("./storage/cvs", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename, media_type="application/pdf")
    html_fallback = file_path.replace(".pdf", ".html")
    if os.path.exists(html_fallback):
        return FileResponse(html_fallback, filename=filename.replace(".pdf", ".html"), media_type="text/html")
    raise HTTPException(status_code=404, detail="Ficheiro PDF não encontrado")
