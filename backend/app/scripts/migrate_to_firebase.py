import argparse
import asyncio
import sys
from sqlalchemy import select

from backend.app.database import AsyncSessionLocal, init_db
from backend.app.firebase import firebase_manager
from backend.app.models.application import Application
from backend.app.models.job import Job
from backend.app.models.profile import Profile


async def migrate_data(email: str) -> None:
    print("--> Migrando dados SQLite para Firebase Firestore multi-tenant...")
    await init_db()

    user = await firebase_manager.get_user_by_email(email)
    if not user:
        print(f"ERRO: Utilizador '{email}' não encontrado no sistema.")
        sys.exit(1)

    user_id = user["id"]

    async with AsyncSessionLocal() as session:
        prof = (await session.execute(select(Profile))).scalar_one_or_none()
        if prof:
            prof_dict = {
                "id": prof.id,
                "user_id": user_id,
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
                "projects": [],
                "languages": [],
                "verified_facts": prof.verified_facts or [],
                "updated_at": str(prof.updated_at)
            }
            await firebase_manager.save_profile(user_id, prof_dict)
            print(f"--> Perfil de '{prof.full_name}' migrado para utilizador '{user_id}'.")

        jobs = (await session.execute(select(Job))).scalars().all()
        for j in jobs:
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
            await firebase_manager.save_job(user_id, job_dict)

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
                await firebase_manager.save_application(user_id, j.id, app_dict)

        print(f"--> {len(jobs)} vagas migradas para o utilizador '{user_id}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrar SQLite legado para Firestore multi-tenant.")
    parser.add_argument("--email", required=True, help="Email da conta destino")
    args = parser.parse_args()
    asyncio.run(migrate_data(args.email))
