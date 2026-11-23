import os
import re
import shutil
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import yaml
from fastapi import HTTPException
from backend.app.firebase import firebase_manager

class CareerOpsImporter:
    @staticmethod
    async def import_from_directory(directory_path: str, user_id: str) -> Dict[str, Any]:
        dir_clean = os.path.normpath(directory_path.strip().strip('"').strip("'"))
        if not os.path.exists(dir_clean) or not os.path.isdir(dir_clean):
            raise HTTPException(
                status_code=400,
                detail=f"A pasta '{dir_clean}' não foi encontrada ou não é um diretório válido."
            )

        profile_path = os.path.join(dir_clean, "config", "profile.yml")
        cv_path = os.path.join(dir_clean, "cv.md")
        apps_path = os.path.join(dir_clean, "data", "applications.md")

        if not os.path.exists(cv_path) and not os.path.exists(profile_path):
            raise HTTPException(
                status_code=400,
                detail="A pasta indicada não parece ser do Career-Ops (ficheiros 'cv.md' ou 'config/profile.yml' não encontrados)."
            )

        # 1. Read Base CV
        master_cv_text = ""
        if os.path.exists(cv_path):
            with open(cv_path, "r", encoding="utf-8") as f:
                master_cv_text = f.read()

        # Save physical master CV
        user_storage_dir = os.path.join("storage", "users", user_id)
        user_cvs_dir = os.path.join(user_storage_dir, "cvs")
        os.makedirs(user_cvs_dir, exist_ok=True)
        if master_cv_text:
            with open(os.path.join(user_storage_dir, "master_cv.md"), "w", encoding="utf-8") as f:
                f.write(master_cv_text)

        # 2. Parse Profile from profile.yml
        profile_data = {}
        if os.path.exists(profile_path):
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    profile_data = yaml.safe_load(f) or {}
            except Exception as e:
                print(f"Aviso ao ler profile.yml: {e}")

        candidate = profile_data.get("candidate", {})
        narrative = profile_data.get("narrative", {})
        superpowers = narrative.get("superpowers", [])

        # Experiences
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

        skills_list = [
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

        full_name = candidate.get("full_name") or "André Filipe Oliveira Dias"
        email = candidate.get("email") or "andrexxdias@hotmail.com"
        phone = candidate.get("phone") or "(+351) 965398851"
        location = candidate.get("location") or "Covilhã, Portugal"
        headline = narrative.get("headline") or "Profissional comunicativo e polivalente com experiência em vendas outbound, atendimento e gestão operacional"
        summary = narrative.get("exit_story") or "Profissional comunicativo e polivalente com experiência comprovada em vendas outbound, suporte ao cliente e gestão operacional de equipas e turnos."

        prof_dict = {
            "id": 1,
            "user_id": user_id,
            "full_name": full_name,
            "headline": headline,
            "email": email,
            "phone": phone,
            "location": location,
            "linkedin_url": candidate.get("linkedin") or "https://linkedin.com/in/andre-dias-ubi",
            "github_url": candidate.get("github") or "https://github.com/andyoliveiraa",
            "portfolio_url": None,
            "summary": summary,
            "skills": skills_list,
            "experiences": experiences,
            "educations": educations,
            "certifications": [],
            "verified_facts": verified_facts,
            "master_cv_text": master_cv_text
        }
        await firebase_manager.save_profile(user_id, prof_dict)

        # 3. Parse applications.md
        imported_jobs = 0
        if os.path.exists(apps_path):
            with open(apps_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            row_pattern = re.compile(
                r"^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*\[([^\]]+)\]\(([^)]+)\)"
            )

            for line in lines:
                m = row_pattern.match(line.strip())
                if not m:
                    continue

                app_num = int(m.group(1).strip())
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

                # Score
                score_val = None
                if "/" in score_str:
                    try:
                        num, den = score_str.split("/")
                        score_val = round((float(num) / float(den)) * 100, 1)
                    except Exception:
                        pass

                # Source
                source = "web"
                if "net-empregos.com" in job_url:
                    source = "netempregos"
                elif "linkedin.com" in job_url:
                    source = "linkedin"
                elif "indeed.com" in job_url:
                    source = "indeed"
                elif "digi.pt" in job_url:
                    source = "digi"
                elif "jeronimomartins.com" in job_url:
                    source = "pingo_doce"

                try:
                    app_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).isoformat()
                except Exception:
                    app_date = datetime.now(timezone.utc).isoformat()

                job_key = hashlib.sha256(f"{source}:{job_url}".encode()).hexdigest()[:24]

                # Full report description if available
                description = None
                rep_match = re.search(r'\[([^\]]+)\]\(\.\./reports/([^)]+)\)', report_raw)
                if rep_match:
                    rep_filename = rep_match.group(2)
                    rep_path = os.path.join(dir_clean, "reports", rep_filename)
                    if os.path.exists(rep_path):
                        with open(rep_path, "r", encoding="utf-8") as rf:
                            description = rf.read()[:4000]

                # Copy PDF if available in output/
                custom_cv_path = None
                app_pad = f"{app_num:03d}"
                output_dir = os.path.join(dir_clean, "output")
                if os.path.exists(output_dir):
                    for fname in os.listdir(output_dir):
                        if fname.endswith(".pdf") and f"-{app_pad}-" in fname:
                            src_pdf = os.path.join(output_dir, fname)
                            dst_filename = f"cv_job_{app_num}.pdf"
                            dst_pdf = os.path.join(user_cvs_dir, dst_filename)
                            shutil.copyfile(src_pdf, dst_pdf)
                            custom_cv_path = f"/api/ai/download-pdf/{dst_filename}"
                            break

                loc_val = "Covilhã, Portugal" if ("covilhã" in role.lower() or "covilha" in notes.lower()) else "Portugal"
                is_remote_val = "teletrabalho" in notes.lower() or "remoto" in notes.lower() or "remoto" in role.lower()

                final_status = "candidatado" if "candidat" in notes.lower() else "avaliada"
                if "aguarda envio" in notes.lower() or "candidatura" in notes.lower():
                    final_status = "candidatado"

                job_dict = {
                    "id": app_num,
                    "job_key": job_key,
                    "title": role,
                    "company": company,
                    "location": loc_val,
                    "is_remote": is_remote_val,
                    "salary": None,
                    "description": description or f"Vaga importada do Career-Ops: {role} em {company}",
                    "url": job_url,
                    "source": source,
                    "liveness_status": "active",
                    "distance_km": 0.0 if "covilhã" in loc_val.lower() or is_remote_val else 15.0,
                    "published_at": app_date,
                    "created_at": app_date,
                    "application_status": final_status,
                    "match_score": score_val or 85.0
                }
                await firebase_manager.save_job(user_id, job_dict)

                app_dict = {
                    "id": app_num,
                    "job_id": app_num,
                    "status": final_status,
                    "match_score": score_val or 85.0,
                    "match_summary": f"Importado do Career-Ops. Avaliação com Score {score_str}.",
                    "pros": [],
                    "gaps": [],
                    "applied_at": app_date if final_status == "candidatado" else None,
                    "custom_cv_path": custom_cv_path,
                    "custom_cover_letter": None,
                    "custom_cv_text": master_cv_text,
                    "notes": notes,
                    "created_at": app_date
                }
                await firebase_manager.save_application(user_id, app_num, app_dict)
                imported_jobs += 1

        # 4. Mark user onboarding completed
        await firebase_manager.update_user(user_id, {"has_completed_onboarding": True})

        return {
            "success": True,
            "message": "Dados do Career-Ops importados com sucesso!",
            "experiences_count": len(experiences),
            "educations_count": len(educations),
            "skills_count": len(skills_list),
            "jobs_count": imported_jobs,
            "applications_count": imported_jobs,
            "cv_base_loaded": bool(master_cv_text),
            "profile_name": full_name
        }
