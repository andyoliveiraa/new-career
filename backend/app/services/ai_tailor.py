import json
import logging
import re
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings
from backend.app.security import decrypt_secret

logger = logging.getLogger(__name__)


def _strip_json_fences(raw_text: str) -> str:
    """Remove markdown code fences around JSON output if present."""
    text = (raw_text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


class AITailorService:
    @staticmethod
    def _resolve_provider_keys(user_keys: Optional[Dict[str, Any]]) -> Dict[str, Optional[str]]:
        keys = user_keys or {}
        return {
            "gemini": decrypt_secret(keys.get("gemini_api_key")) or settings.GEMINI_API_KEY,
            "groq": decrypt_secret(keys.get("groq_api_key")) or settings.GROQ_API_KEY,
            "openai": decrypt_secret(keys.get("openai_api_key")) or settings.OPENAI_API_KEY,
        }

    @staticmethod
    def _provider_order(
        resolved_keys: Dict[str, Optional[str]],
        preferred: Optional[str] = None
    ) -> List[str]:
        order: List[str] = []
        for candidate in [preferred, "gemini", "groq", "openai"]:
            if candidate and candidate in resolved_keys and resolved_keys[candidate] and candidate not in order:
                order.append(candidate)
        return order

    @staticmethod
    async def _call_gemini(api_key: str, prompt: str, system_prompt: str) -> Optional[str]:
        model = settings.GEMINI_MODEL or "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": f"{system_prompt}\n\n{prompt}"}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates") or []
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text")
            logger.warning(f"Gemini API returned HTTP {resp.status_code}: {resp.text[:200]}")
        return None

    @staticmethod
    async def _call_openai_compatible(
        url: str,
        api_key: str,
        model: str,
        prompt: str,
        system_prompt: str,
        provider_label: str
    ) -> Optional[str]:
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt or "You are an expert career and resume specialist."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices") or []
                if choices:
                    return choices[0].get("message", {}).get("content")
            logger.warning(f"{provider_label} API returned HTTP {resp.status_code}: {resp.text[:200]}")
        return None

    @classmethod
    async def call_llm(
        cls,
        prompt: str,
        system_prompt: str = "",
        provider: Optional[str] = None,
        user_keys: Optional[Dict[str, Any]] = None
    ) -> str:
        """Call AI providers with automatic cascade fallback across all configured keys."""
        resolved = cls._resolve_provider_keys(user_keys)
        preferred = (provider or (user_keys or {}).get("primary_ai_provider") or "").strip().lower() or None
        providers_to_try = cls._provider_order(resolved, preferred=preferred)

        for prov in providers_to_try:
            api_key = resolved.get(prov)
            if not api_key:
                continue
            try:
                result: Optional[str] = None
                if prov == "gemini":
                    result = await cls._call_gemini(api_key, prompt, system_prompt)
                elif prov == "groq":
                    result = await cls._call_openai_compatible(
                        "https://api.groq.com/openai/v1/chat/completions",
                        api_key,
                        settings.GROQ_MODEL or "llama-3.3-70b-versatile",
                        prompt,
                        system_prompt,
                        "Groq"
                    )
                elif prov == "openai":
                    result = await cls._call_openai_compatible(
                        "https://api.openai.com/v1/chat/completions",
                        api_key,
                        settings.OPENAI_MODEL or "gpt-4o-mini",
                        prompt,
                        system_prompt,
                        "OpenAI"
                    )

                if result:
                    return _strip_json_fences(result)
            except Exception as e:
                logger.warning(f"Falha ao contactar provedor de IA '{prov}': {e}")

        return cls._offline_fallback_analysis(prompt)

    @staticmethod
    def _offline_fallback_analysis(
        prompt: str,
        job_dict: Optional[Dict[str, Any]] = None,
        profile_dict: Optional[Dict[str, Any]] = None
    ) -> str:
        """Deterministic heuristic offline fallback when no LLM API key succeeds."""
        job = job_dict or {}
        profile = profile_dict or {}
        title = job.get("title") or "função pretendida"
        company = job.get("company") or "organização"
        desc_lower = (job.get("description") or prompt or "").lower()
        skills = [str(s) for s in (profile.get("skills") or []) if s]

        matched_skills = [s for s in skills if s.lower() in desc_lower]
        missing_skills = [s for s in skills if s.lower() not in desc_lower]

        if skills:
            ratio = len(matched_skills) / max(len(skills), 1)
            score = round(min(94.0, max(52.0, 58.0 + ratio * 38.0)), 1)
        else:
            score = 65.0

        keywords = matched_skills[:8] if matched_skills else skills[:6]
        if not keywords:
            keywords = ["Comunicação", "Resolução de Problemas", "Trabalho em Equipa"]

        strengths = []
        if matched_skills:
            strengths.append(f"Correspondência direta nas competências: {', '.join(matched_skills[:5])}.")
        if profile.get("experiences"):
            strengths.append(f"Experiência prática comprovada ({len(profile['experiences'])} registos no perfil mestre).")
        if not strengths:
            strengths.append("Perfil base configurado para candidatura direcionada.")

        gaps = [
            "Análise offline heurística: configure uma chave Gemini, Groq ou OpenAI em Configurações para diagnóstico semântico completo.",
        ]
        if missing_skills:
            gaps.append(f"Verifique se competências como {', '.join(missing_skills[:3])} devem ser priorizadas para esta vaga.")

        full_name = profile.get("full_name") or "Candidato"
        summary_text = profile.get("summary") or f"Profissional orientado a resultados com foco em {title}."
        skills_preview = ", ".join(keywords[:4])

        fallback = {
            "match_score": score,
            "summary": f"Análise heurística para {title} na {company}: {len(matched_skills)} competências alinhadas detetadas na descrição.",
            "strengths": strengths,
            "gaps": gaps,
            "keywords": keywords,
            "recommendation": "Adapte o resumo e os pontos de experiência para espelhar os requisitos principais da oferta.",
            "tailored_summary": summary_text,
            "tailored_experiences": profile.get("experiences", []),
            "highlighted_skills": keywords,
            "cover_letter_text": (
                f"Exma. Equipa da {company},\n\n"
                f"Apresento a minha candidatura à posição de {title}. O meu percurso inclui experiência prática em {skills_preview}, "
                f"com foco consistente em entrega com qualidade e colaboração.\n\n"
                f"Terei todo o gosto em detalhar em entrevista como posso contribuir para os objetivos da equipa.\n\n"
                f"Com os melhores cumprimentos,\n{full_name}"
            ),
            "linkedin_note": f"Olá! Vi a vaga de {title} na {company} e identifiquei forte alinhamento com a minha experiência em {skills_preview}. Gostaria de conectar.",
            "likely_questions": [
                {
                    "question": f"Qual foi o projeto ou responsabilidade mais relevante para a função de {title}?",
                    "purpose": "Avaliar aderência técnica e impacto mensurável",
                    "recommended_star_angle": "Estruture em Situação, Tarefa, Ação concreta tomada e Resultado quantificado."
                },
                {
                    "question": "Como prioriza tarefas concorrentes quando os prazos são exigentes?",
                    "purpose": "Avaliar organização, comunicação e tomada de decisão",
                    "recommended_star_angle": "Descreva um caso real onde alinhou expectativas e garantiu a entrega crítica."
                },
                {
                    "question": f"O que o motivou a candidatar-se à {company}?",
                    "purpose": "Validar preparação e alinhamento cultural",
                    "recommended_star_angle": "Ligue os desafios da vaga às suas competências comprovadas no perfil mestre."
                }
            ],
            "company_intel": {
                "company": company,
                "role": title,
                "mode": "heuristic_offline",
                "focus_areas": keywords[:5]
            }
        }
        return json.dumps(fallback, ensure_ascii=False)

    @classmethod
    async def analyze_fit(
        cls,
        job_dict: Dict[str, Any],
        profile_dict: Dict[str, Any],
        provider: Optional[str] = None,
        user_keys: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are an elite Tech Career Advisor and ATS Auditor. Analyze the job posting vs candidate profile. "
            "Respond in Portuguese (PT-PT) unless the job requires another language. "
            "Output strictly valid JSON with keys: match_score (float 0-100), summary (string), strengths (list of strings), "
            "gaps (list of strings), keywords (list of strings), recommendation (string)."
        )
        prompt = f"""
Job Title: {job_dict.get('title')}
Company: {job_dict.get('company')}
Location: {job_dict.get('location')}
Job Description:
{(job_dict.get('description') or '')[:3500]}

Candidate Profile:
Name: {profile_dict.get('full_name')}
Skills: {json.dumps(profile_dict.get('skills', []), ensure_ascii=False)}
Summary: {profile_dict.get('summary', '')}
Experience: {json.dumps(profile_dict.get('experiences', []), ensure_ascii=False)[:2500]}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, provider=provider, user_keys=user_keys)
        try:
            parsed = json.loads(_strip_json_fences(raw_res))
            if "match_score" in parsed:
                return parsed
        except Exception:
            pass
        return json.loads(cls._offline_fallback_analysis(prompt, job_dict, profile_dict))

    @classmethod
    async def tailor_cv(
        cls,
        job_dict: Dict[str, Any],
        profile_dict: Dict[str, Any],
        provider: Optional[str] = None,
        tone: str = "direct",
        user_keys: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are an ATS CV Optimization expert. Your job is to adapt the candidate's summary and experience bullets "
            "to mirror the Job Description terminology WITHOUT hallucinating false experience. Every claim must remain true to the original profile. "
            f"Use a '{tone}' communication tone. "
            "Output strictly valid JSON with keys: tailored_summary (string), tailored_experiences (list of dicts matching candidate experience structure), "
            "highlighted_skills (list of strings)."
        )
        prompt = f"""
Target Job:
{job_dict.get('title')} at {job_dict.get('company')}
Description: {(job_dict.get('description') or '')[:3000]}

Candidate Raw Profile:
{json.dumps(profile_dict, indent=2, ensure_ascii=False)[:5000]}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, provider=provider, user_keys=user_keys)
        try:
            data = json.loads(_strip_json_fences(raw_res))
            return {
                "tailored_summary": data.get("tailored_summary") or profile_dict.get("summary", ""),
                "tailored_experiences": data.get("tailored_experiences") or profile_dict.get("experiences", []),
                "highlighted_skills": data.get("highlighted_skills") or profile_dict.get("skills", [])
            }
        except Exception:
            return {
                "tailored_summary": profile_dict.get("summary", ""),
                "tailored_experiences": profile_dict.get("experiences", []),
                "highlighted_skills": profile_dict.get("skills", [])
            }

    @classmethod
    async def generate_cover_letter(
        cls,
        job_dict: Dict[str, Any],
        profile_dict: Dict[str, Any],
        angle: str = "direct",
        provider: Optional[str] = None,
        user_keys: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are a master communicator. Write a concise, authentic, high-impact cover letter (maximum 250 words) "
            "and a LinkedIn connection note (maximum 280 characters). Avoid clichés, corporate jargon, and exclamation marks. "
            "Output strictly valid JSON with keys: cover_letter_text (string), linkedin_note (string)."
        )
        prompt = f"""
Angle: {angle}
Job Title: {job_dict.get('title')}
Company: {job_dict.get('company')}
Description: {(job_dict.get('description') or '')[:2500]}

Candidate Name: {profile_dict.get('full_name')}
Candidate Background: {profile_dict.get('summary', '')}
Skills: {json.dumps(profile_dict.get('skills', []), ensure_ascii=False)}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, provider=provider, user_keys=user_keys)
        try:
            parsed = json.loads(_strip_json_fences(raw_res))
            if parsed.get("cover_letter_text"):
                return parsed
        except Exception:
            pass
        fallback = json.loads(cls._offline_fallback_analysis(prompt, job_dict, profile_dict))
        return {
            "cover_letter_text": fallback["cover_letter_text"],
            "linkedin_note": fallback["linkedin_note"]
        }

    @classmethod
    async def generate_interview_prep(
        cls,
        job_dict: Dict[str, Any],
        profile_dict: Dict[str, Any],
        provider: Optional[str] = None,
        user_keys: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are an Executive Interview Coach. Generate 4 realistic behavioral & technical interview questions "
            "tailored to the job posting and candidate profile using the STAR+R method. "
            "Output strictly valid JSON with keys: likely_questions (list of objects with 'question', 'purpose', 'recommended_star_angle'), "
            "company_intel (object with 'company', 'role', 'focus_areas' list)."
        )
        prompt = f"""
Job Title: {job_dict.get('title')}
Company: {job_dict.get('company')}
Location: {job_dict.get('location')}
Description: {(job_dict.get('description') or '')[:3000]}

Candidate Skills: {json.dumps(profile_dict.get('skills', []), ensure_ascii=False)}
Candidate Experiences: {json.dumps(profile_dict.get('experiences', []), ensure_ascii=False)[:2000]}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, provider=provider, user_keys=user_keys)
        try:
            parsed = json.loads(_strip_json_fences(raw_res))
            if isinstance(parsed.get("likely_questions"), list) and parsed["likely_questions"]:
                return {
                    "likely_questions": parsed["likely_questions"],
                    "company_intel": parsed.get("company_intel") or {
                        "company": job_dict.get("company"),
                        "role": job_dict.get("title")
                    }
                }
        except Exception:
            pass
        fallback = json.loads(cls._offline_fallback_analysis(prompt, job_dict, profile_dict))
        return {
            "likely_questions": fallback["likely_questions"],
            "company_intel": fallback["company_intel"]
        }
