import asyncio
import os
import json
from sqlalchemy import select
from backend.app.database import AsyncSessionLocal, init_db
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.profile import Profile
from backend.app.firebase import firebase_manager

async def migrate_data():
    print("--> Migrando dados para Firebase Firestore...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # 1. Migrate Profile
        prof = (await session.execute(select(Profile))).scalar_one_or_none()
        if prof:
            prof_dict = {
                "id": prof.id,
                "full_name": prof.full_name,
                "headline": prof.headline,
                "email": prof.email,
                "phone": prof.phone,
                "location": prof.location,
                "linkedin_url": prof.linkedin_url,
                "github_url": prof.github_url,
                "portfolio_url": prof.portfolio_url,
                "summary": prof.summary,
                "skills": prof.skills or [],
                "experiences": prof.experiences or [],
                "educations": prof.educations or [],
                "certifications": prof.certifications or [],
                "verified_facts": prof.verified_facts or [],
                "updated_at": str(prof.updated_at)
            }
            await firebase_manager.save_profile(prof_dict)
            print(f"--> Perfil de '{prof.full_name}' migrado para Firebase com sucesso!")

        # 2. Migrate Jobs and Applications
        jobs = (await session.execute(select(Job))).scalars().all()
        for j in jobs:
            # Get linked application
            app = (await session.execute(select(Application).where(Application.job_id == j.id))).scalar_one_or_none()
            
            job_dict = {
                "id": j.id,
                "job_key": j.job_key,
                "title": j.title,
                "company": j.company,
                "location": j.location,
                "is_remote": j.is_remote,
                "salary": j.salary,
                "description": j.description,
                "url": j.url,
                "source": j.source,
                "liveness_status": j.liveness_status,
                "liveness_checked_at": str(j.liveness_checked_at) if j.liveness_checked_at else None,
                "liveness_reason": j.liveness_reason,
                "distance_km": j.distance_km,
                "published_at": str(j.published_at) if j.published_at else None,
                "created_at": str(j.created_at) if j.created_at else None,
                "application_status": app.status if app else "disponivel",
                "match_score": app.match_score if app else None
            }
            await firebase_manager.save_job(job_dict)

            if app:
                app_dict = {
                    "id": app.id,
                    "job_id": app.job_id,
                    "status": app.status,
                    "match_score": app.match_score,
                    "match_summary": app.match_summary,
                    "pros": app.pros,
                    "gaps": app.gaps,
                    "applied_at": str(app.applied_at) if app.applied_at else None,
                    "custom_cv_path": app.custom_cv_path,
                    "custom_cover_letter": app.custom_cover_letter,
                    "custom_cv_text": app.custom_cv_text,
                    "notes": app.notes,
                    "created_at": str(app.created_at) if app.created_at else None
                }
                await firebase_manager.save_application(j.id, app_dict)

        print(f"--> {len(jobs)} vagas e candidaturas migradas com sucesso para Firebase Firestore!")

if __name__ == "__main__":
    asyncio.run(migrate_data())
