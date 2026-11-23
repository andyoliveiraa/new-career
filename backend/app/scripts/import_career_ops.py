import asyncio
import os
import re
import shutil
import hashlib
from datetime import datetime, timezone
import yaml
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

from backend.app.config import settings
from backend.app.database import Base, init_db
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.profile import Profile
from backend.app.services.geo_filter import calculate_job_distance

CAREER_OPS_DIR = r"C:\Users\andy_\Desktop\IA\career-ops"

async def import_career_ops_data():
    print(f"--> Iniciando importação do Career-Ops de: {CAREER_OPS_DIR}")
    
    # Ensure tables exist
    await init_db()
    
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSession = async_sessionmaker(bind=engine, expire_on_commit=False)
    
    # 1. Import Profile from config/profile.yml and cv.md
    profile_path = os.path.join(CAREER_OPS_DIR, "config", "profile.yml")
    cv_path = os.path.join(CAREER_OPS_DIR, "cv.md")
    
    profile_data = {}
    if os.path.exists(profile_path):
        with open(profile_path, "r", encoding="utf-8") as f:
            profile_data = yaml.safe_load(f) or {}

    candidate = profile_data.get("candidate", {})
    narrative = profile_data.get("narrative", {})
    target_roles = profile_data.get("target_roles", {}).get("primary", [])
    superpowers = narrative.get("superpowers", [])

    # Master Experience parsed from cv.md
    experiences = [
        {
            "role": "Gestor de Turno",
            "company": "Pans & Company",
            "period": "10/08/2026 - 23/10/2026",
            "location": "Covilhã, Portugal",
            "bullets": [
                "Gestão operacional da equipa e planeamento diário de escalas;",
                "Assegurar a máxima satisfação e fidelização do cliente;",
                "Planeamento rigoroso e controlo de stocks e consumíveis;",
                "Garantir a verificação e registos segundo as normas HACCP;",
                "Antecipação e resolução de eventuais conflitos em ambiente de ritmo acelerado;",
                "Cumprimento dos standards de produto, serviço e metas do negócio."
            ]
        },
        {
            "role": "Dirigente Associativo",
            "company": "CéuInquieto – Associação de Comunicação Criativa",
            "period": "10/09/2025 - 10/09/2026",
            "location": "Covilhã, Portugal",
            "bullets": [
                "Coordenação e gestão direta da equipa criativa e distribuição estratégica de tarefas;",
                "Supervisão do calendário editorial online e cumprimento rigoroso de prazos;",
                "Administração técnica, manutenção contínua e programação web do website oficial;",
                "Gestão de conteúdos (CMS), publicação e integração estrutural multimédia;",
                "Troubleshooting rápido, monitorização de performance e design responsivo."
            ]
        },
        {
            "role": "Outbound Sales Representative",
            "company": "Teleperformance Portugal",
            "period": "14/10/2025 - 07/08/2026",
            "location": "Covilhã, Portugal",
            "bullets": [
                "Comercialização ativa de serviços via contacto telefónico com foco em captação e fidelização;",
                "Realização de chamadas outbound e atendimento inbound identificando necessidades;",
                "Gestão de carteira de clientes e registo de interações em sistema CRM;",
                "Cumprimento consistente de metas comerciais e indicadores de desempenho (KPIs);",
                "Tratamento de objeções, negociação contratual e fecho de vendas sob pressão."
            ]
        },
        {
            "role": "Técnico de Bar",
            "company": "Anitudes – Animação Turística Cultural e Desportiva Lda",
            "period": "20/06/2025 - 30/09/2025",
            "location": "Mirandela, Portugal",
            "bullets": [
                "Gestão e operação autônoma integral do bar (único responsável no turno);",
                "Gestão financeira, controlo de caixa diário, registo de vendas e administração de contas;",
                "Controlo e reposição de stock, assegurando conformidade com higiene e segurança alimentar."
            ]
        },
        {
            "role": "Assistente de Loja & Suporte Técnico",
            "company": "Power PC",
            "period": "01/05/2022 - 25/07/2022",
            "location": "Mirandela, Portugal",
            "bullets": [
                "Atendimento ao público e suporte técnico informático;",
                "Reparação e manutenção de equipamentos de hardware e software;",
                "Gestão e controlo de stock em loja de informática."
            ]
        }
    ]

    educations = [
        {
            "degree": "Técnico de Comunicação, Marketing, Relações Públicas e Publicidade (Nível 4 QEQ)",
            "institution": "Escola Profissional de Murça",
            "period": "2020 - 2022"
        },
        {
            "degree": "Informática Web, Móvel e na Nuvem (Frequência Universitária)",
            "institution": "Universidade da Beira Interior (UBI)",
            "period": "2022 - 2025"
        }
    ]

    all_skills = [
        "Comunicação Interpessoal", "Vendas Outbound", "Negociação & Fecho",
        "Atendimento ao Cliente / Contact Center", "Gestão de Equipas",
        "Gestão de Stocks & Inventário", "Regulamentação HACCP", "Resolução de Conflitos",
        "Suporte Técnico (Hardware & Software)", "Administração Web & CMS", "Sistemas CRM",
        "Inglês (B1)"
    ]

    verified_facts = [
        "Mais de 2 anos de experiência profissional em contacto com clientes e gestão de equipas.",
        "Experiência comprovada em metas de vendas outbound na Teleperformance Portugal.",
        "Gestão de turno com HACCP e controlo de stocks na restauração (Pans & Company).",
        "Competências de suporte técnico em hardware e software (Power PC) e gestão web (CéuInquieto).",
        "Frequência universitária em Informática Web, Móvel e Nuvem na UBI."
    ]

    async with AsyncSession() as session:
        # Update or Insert Profile
        prof_res = await session.execute(select(Profile).limit(1))
        existing_profile = prof_res.scalar_one_or_none()
        
        full_name = candidate.get("full_name") or "André Filipe Oliveira Dias"
        email = candidate.get("email") or "andrexxdias@hotmail.com"
        phone = candidate.get("phone") or "(+351) 965398851"
        location = candidate.get("location") or "Covilhã, Portugal"
        headline = narrative.get("headline") or "Profissional comunicativo e polivalente com experiência em vendas outbound, atendimento e gestão operacional"
        summary = narrative.get("exit_story") or "Profissional comunicativo e polivalente com experiência comprovada em vendas outbound, suporte ao cliente e gestão operacional de equipas e turnos."

        if existing_profile:
            existing_profile.full_name = full_name
            existing_profile.email = email
            existing_profile.phone = phone
            existing_profile.location = location
            existing_profile.headline = headline
            existing_profile.summary = summary
            existing_profile.skills = all_skills
            existing_profile.experiences = experiences
            existing_profile.educations = educations
            existing_profile.verified_facts = verified_facts
        else:
            new_prof = Profile(
                full_name=full_name,
                headline=headline,
                email=email,
                phone=phone,
                location=location,
                summary=summary,
                skills=all_skills,
                experiences=experiences,
                educations=educations,
                verified_facts=verified_facts
            )
            session.add(new_prof)
        
        await session.commit()
        print("--> Perfil mestre importado com sucesso!")

    # 2. Parse applications.md and import applications + jobs
    apps_file = os.path.join(CAREER_OPS_DIR, "data", "applications.md")
    if not os.path.exists(apps_file):
        print(f"Arquivo não encontrado: {apps_file}")
        return

    # Ensure storage/cvs directory exists
    os.makedirs("./storage/cvs", exist_ok=True)
    
    imported_count = 0
    with open(apps_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Pattern for markdown table row:
    # | # | Date | Company | Via | Role | Score | Status | PDF | Report | Notes | URL |
    row_pattern = re.compile(r"^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*\[([^\]]+)\]\(([^)]+)\)")

    async with AsyncSession() as session:
        for line in lines:
            m = row_pattern.match(line.strip())
            if not m:
                continue

            app_num = m.group(1).strip()
            date_str = m.group(2).strip()
            company = m.group(3).strip()
            via = m.group(4).strip()
            role = m.group(5).strip()
            score_str = m.group(6).strip()
            status_raw = m.group(7).strip()
            pdf_check = m.group(8).strip()
            report_raw = m.group(9).strip()
            notes = m.group(10).strip()
            source_domain = m.group(11).strip()
            job_url = m.group(12).strip()

            if company == "?" and via != "—":
                company = via

            # Convert score e.g. "4.5/5" -> 90.0
            score_val = None
            if "/" in score_str:
                try:
                    num, den = score_str.split("/")
                    score_val = round((float(num) / float(den)) * 100, 1)
                except Exception:
                    pass

            # Detect source
            source = "web"
            if "net-empregos.com" in job_url:
                source = "netempregos"
            elif "linkedin.com" in job_url:
                source = "linkedin"
            elif "indeed.com" in job_url:
                source = "indeed"
            elif "allianz.com" in job_url:
                source = "allianz"
            elif "digi.pt" in job_url:
                source = "digi"
            elif "olx.pt" in job_url:
                source = "olx"
            elif "jeronimomartins.com" in job_url:
                source = "pingo_doce"

            # Parse date
            try:
                app_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                app_date = datetime.now(timezone.utc)

            # Generate unique key
            job_key = hashlib.sha256(f"{source}:{job_url}".encode()).hexdigest()[:24]

            # Read report if available for full description & strengths
            description = None
            rep_match = re.search(r'\[([^\]]+)\]\(\.\./reports/([^)]+)\)', report_raw)
            if rep_match:
                rep_filename = rep_match.group(2)
                rep_path = os.path.join(CAREER_OPS_DIR, "reports", rep_filename)
                if os.path.exists(rep_path):
                    with open(rep_path, "r", encoding="utf-8") as rf:
                        rep_content = rf.read()
                        description = rep_content[:4000]

            # Copy PDF if available in output/
            custom_cv_path = None
            # Search for cv pdf matching app_num e.g. cv-andre-dias-001*
            app_pad = f"{int(app_num):03d}"
            output_dir = os.path.join(CAREER_OPS_DIR, "output")
            if os.path.exists(output_dir):
                for fname in os.listdir(output_dir):
                    if fname.endswith(".pdf") and f"-{app_pad}-" in fname:
                        src_pdf = os.path.join(output_dir, fname)
                        dst_pdf = os.path.join("./storage/cvs", f"cv_job_{app_num}.pdf")
                        shutil.copyfile(src_pdf, dst_pdf)
                        custom_cv_path = f"/api/ai/download-pdf/cv_job_{app_num}.pdf"
                        break

            # Calculate distance to Covilhã
            loc_val = "Covilhã, Portugal" if ("covilhã" in role.lower() or "covilha" in notes.lower()) else "Portugal"
            is_remote_val = "teletrabalho" in notes.lower() or "remoto" in notes.lower() or "remoto" in role.lower()

            # Check if job already exists
            job_stmt = select(Job).where(Job.job_key == job_key)
            existing_job = (await session.execute(job_stmt)).scalar_one_or_none()

            if not existing_job:
                new_job = Job(
                    job_key=job_key,
                    title=role,
                    company=company,
                    location=loc_val,
                    is_remote=is_remote_val,
                    description=description,
                    url=job_url,
                    source=source,
                    liveness_status="active",
                    distance_km=0.0 if "covilhã" in loc_val.lower() or is_remote_val else 15.0,
                    published_at=app_date
                )
                session.add(new_job)
                await session.flush()
                target_job_id = new_job.id
            else:
                target_job_id = existing_job.id
                if description and not existing_job.description:
                    existing_job.description = description

            # Create or update Application
            app_stmt = select(Application).where(Application.job_id == target_job_id)
            existing_app = (await session.execute(app_stmt)).scalar_one_or_none()

            # Status in career-ops was Evaluated (with PDF prepared)
            final_status = "candidatado" if "candidat" in notes.lower() else "avaliada"
            if "aguarda envio" in notes.lower() or "candidatura" in notes.lower():
                final_status = "candidatado"

            if not existing_app:
                new_app = Application(
                    job_id=target_job_id,
                    status=final_status,
                    match_score=score_val or 85.0,
                    applied_at=app_date,
                    notes=notes,
                    custom_cv_path=custom_cv_path
                )
                session.add(new_app)
            else:
                existing_app.status = final_status
                existing_app.match_score = score_val or existing_app.match_score
                existing_app.notes = notes
                if custom_cv_path:
                    existing_app.custom_cv_path = custom_cv_path

            imported_count += 1

        await session.commit()
    
    print(f"--> Sucesso! {imported_count} candidaturas e vagas do Career-Ops importadas com sucesso!")

if __name__ == "__main__":
    asyncio.run(import_career_ops_data())
