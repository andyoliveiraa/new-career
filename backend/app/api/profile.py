from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_db
from backend.app.models.profile import Profile
from backend.app.schemas.profile import ProfileBase, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/profile", tags=["Profile"])

DEFAULT_PROFILE = {
    "full_name": "Andy Oliveira",
    "headline": "Full Stack Engineer & AI Automation Specialist",
    "email": "oliveira.dias@ubi.pt",
    "phone": "+351 912 345 678",
    "location": "Covilhã / Lisboa, Portugal (Aberto a Remoto)",
    "linkedin_url": "https://linkedin.com/in/andyoliveiraa",
    "github_url": "https://github.com/andyoliveiraa",
    "portfolio_url": "https://github.com/andyoliveiraa/new-career",
    "summary": "Engenheiro de Software com experiência prática no desenvolvimento de sistemas backend resilientes, automação de processos, pipelines de IA e scraping assíncrono. Forte foco em código limpo, arquitetura orientada a dados e soluções de alto impacto.",
    "skills": ["Python", "FastAPI", "Next.js", "React", "TypeScript", "Tailwind CSS", "Docker", "SQL / SQLite", "Playwright", "Web Scraping", "AI APIs (Gemini/OpenAI)"],
    "experiences": [
        {
            "role": "Engenheiro de Automação & Full Stack",
            "company": "Projetos Independentes & Open Source",
            "period": "2024 - Presente",
            "location": "Portugal (Remoto)",
            "bullets": [
                "Desenvolvimento e arquitetura de bots assíncronos e plataformas de monitoramento de mercado com scraping multitermo e integração de APIs de busca.",
                "Implementação de pipelines de validação em tempo real e geração automatizada de currículos ATS-friendly com Playwright e modelos de linguagem.",
                "Construção de interfaces modernas com design systems de alta densidade e foco em experiência do usuário (Unslop Standard)."
            ]
        }
    ],
    "educations": [
        {
            "degree": "Licenciatura / Mestrado em Engenharia Informática",
            "institution": "Universidade da Beira Interior (UBI)",
            "period": "Concluído / Em curso"
        }
    ],
    "certifications": [],
    "verified_facts": [
        "Domínio fluente de Python e ecossistemas assíncronos (FastAPI, asyncio, aiosqlite).",
        "Experiência com scrapers resilientes contornando rate-limits e fallbacks de APIs.",
        "Desenvolvimento de frontends modernos em Next.js e Tailwind CSS."
    ]
}

@router.get("", response_model=ProfileResponse)
async def get_profile(db: AsyncSession = Depends(get_db)):
    stmt = select(Profile).limit(1)
    res = await db.execute(stmt)
    prof = res.scalar_one_or_none()
    
    if not prof:
        prof = Profile(**DEFAULT_PROFILE)
        db.add(prof)
        await db.commit()
        await db.refresh(prof)
        
    return prof

@router.put("", response_model=ProfileResponse)
async def update_profile(profile_data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Profile).limit(1)
    res = await db.execute(stmt)
    prof = res.scalar_one_or_none()
    
    if not prof:
        prof = Profile(**profile_data.model_dump())
        db.add(prof)
    else:
        for field, value in profile_data.model_dump().items():
            setattr(prof, field, value)

    await db.commit()
    await db.refresh(prof)
    return prof
