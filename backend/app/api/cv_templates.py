import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse

from backend.app.firebase import firebase_manager
from backend.app.auth_utils import get_current_user
from backend.app.schemas.cv_template import (
    CVTemplateCreate,
    CVTemplateUpdate,
    CVTemplateResponse,
    ATSAuditRequest,
    ATSAuditResponse,
    CVPreviewRequest
)
from backend.app.services.ats_auditor import ATSAuditorService
from backend.app.services.pdf_generator import PDFGeneratorService

router = APIRouter(prefix="/cv-templates", tags=["CV Templates"])

@router.get("", response_model=List[CVTemplateResponse])
async def list_templates(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    templates = await firebase_manager.list_cv_templates(user_id)
    return [CVTemplateResponse(**t) for t in templates]

@router.post("", response_model=CVTemplateResponse)
async def create_template(request: CVTemplateCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    template_data = request.model_dump()
    saved = await firebase_manager.save_cv_template(user_id, template_data)
    return CVTemplateResponse(**saved)

@router.get("/{template_id}", response_model=CVTemplateResponse)
async def get_template(template_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    template = await firebase_manager.get_cv_template(user_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de CV não encontrado")
    return CVTemplateResponse(**template)

@router.put("/{template_id}", response_model=CVTemplateResponse)
async def update_template(template_id: str, request: CVTemplateUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    template = await firebase_manager.get_cv_template(user_id, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de CV não encontrado")

    update_dict = request.model_dump(exclude_unset=True)
    template.update(update_dict)
    saved = await firebase_manager.save_cv_template(user_id, template)
    return CVTemplateResponse(**saved)

@router.delete("/{template_id}")
async def delete_template(template_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    success = await firebase_manager.delete_cv_template(user_id, template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Modelo de CV não encontrado ou já apagado")
    return {"message": "Modelo de CV apagado com sucesso"}

@router.post("/audit", response_model=ATSAuditResponse)
async def audit_cv_template(request: ATSAuditRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    profile_data = request.profile
    if not profile_data:
        profile_data = await firebase_manager.get_profile(user_id)

    job_data = None
    if request.job_id:
        job_data = await firebase_manager.get_job(user_id, request.job_id)

    audit_result = ATSAuditorService.audit(request.template, profile_data, job_data)
    return audit_result

@router.post("/preview", response_class=HTMLResponse)
async def preview_cv_template(request: CVPreviewRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = current_user["id"]
    profile_data = await firebase_manager.get_profile(user_id)

    # Provide fallback sample data if profile is empty
    if not profile_data.get("full_name"):
        profile_data = {
            "full_name": current_user.get("full_name") or "André Dias",
            "headline": "Senior Full Stack Engineer & Cloud Architect",
            "email": current_user.get("email") or "andre@example.com",
            "phone": "+351 912 345 678",
            "location": "Lisboa, Portugal",
            "linkedin_url": "linkedin.com/in/andredias",
            "github_url": "github.com/andredias",
            "portfolio_url": "andredias.dev",
            "summary": "Engenheiro de Software com mais de 7 anos de experiência no desenvolvimento de sistemas web escaláveis, arquiteturas serverless e microserviços. Histórico comprovado de otimização de performance e liderança técnica.",
            "skills": ["TypeScript", "React", "Python", "FastAPI", "Node.js", "Docker", "AWS", "PostgreSQL", "CI/CD", "Redis", "GraphQL", "Tailwind CSS"],
            "experiences": [
                {
                    "role": "Lead Full Stack Engineer",
                    "company": "Tech Innovations Lda",
                    "period": "2022 - Presente",
                    "location": "Lisboa, Portugal",
                    "bullets": [
                        "Arquiteto de infraestrutura cloud que reduziu a latência de resposta em 42% para mais de 100.000 utilizadores ativos.",
                        "Liderou equipa de 6 engenheiros na migração de monolito para microserviços em Docker e Kubernetes.",
                        "Automatizou pipelines de CI/CD resultando numa poupança de 15 horas semanais na equipa."
                    ]
                },
                {
                    "role": "Software Developer",
                    "company": "Global Solutions S.A.",
                    "period": "2019 - 2022",
                    "location": "Porto, Portugal",
                    "bullets": [
                        "Desenvolveu APIs REST de alta performance em Python e Node.js para processamento de pagamentos com €2M+ transacionados.",
                        "Implementou cobertura de testes automatizados unitários e de integração de 85%."
                    ]
                }
            ],
            "educations": [
                {
                    "degree": "Mestrado em Engenharia Informática",
                    "institution": "Universidade da Beira Interior",
                    "period": "2017 - 2019"
                }
            ],
            "certifications": [
                {
                    "name": "AWS Certified Solutions Architect - Associate",
                    "issuer": "Amazon Web Services"
                }
            ],
            "projects": [
                {
                    "title": "Cloud Scale Analytics",
                    "tech": "FastAPI, React, ClickHouse",
                    "description": "Dashboard analítico para monitorização de métricas de telemetria em tempo real com milhões de eventos processados diariamente."
                }
            ],
            "languages": [
                {"name": "Português", "level": "Nativo"},
                {"name": "Inglês", "level": "Fluente (C1)"}
            ]
        }

    html = PDFGeneratorService.render_html(
        profile_dict=profile_data,
        tailored_summary=request.tailored_summary or "",
        tailored_experiences=request.tailored_experiences,
        highlighted_skills=request.highlighted_skills,
        template_config=request.template.model_dump()
    )
    return HTMLResponse(content=html)
