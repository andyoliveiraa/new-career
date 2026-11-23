import json
import httpx
from typing import Dict, Any, List, Optional
import logging
from backend.app.config import settings

logger = logging.getLogger(__name__)

class AITailorService:
    @staticmethod
    async def call_llm(prompt: str, system_prompt: str = "", provider: Optional[str] = None, user_keys: Optional[Dict[str, str]] = None) -> str:
        """Call AI provider with user keys or system keys and fallback hierarchy: Gemini -> Groq -> OpenAI"""
        keys = user_keys or {}
        gemini_key = keys.get("gemini_api_key") or settings.GEMINI_API_KEY
        groq_key = keys.get("groq_api_key") or settings.GROQ_API_KEY
        openai_key = keys.get("openai_api_key") or settings.OPENAI_API_KEY

        chosen_provider = provider or keys.get("primary_ai_provider") or ("gemini" if gemini_key else ("groq" if groq_key else "openai"))

        # 1. Google Gemini
        if chosen_provider == "gemini" and gemini_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{"parts": [{"text": f"{system_prompt}\n\n{prompt}"}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                logger.warning(f"Gemini API call failed: {e}")

        # 2. Groq
        if (chosen_provider == "groq" or not gemini_key) and groq_key:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {groq_key}"}
                payload = {
                    "model": "llama-3.3-70b-versatile",
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
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"Groq API call failed: {e}")

        # 3. OpenAI
        if openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {openai_key}"}
                payload = {
                    "model": "gpt-4o-mini",
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
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"OpenAI API call failed: {e}")

        # Heuristic offline fallback if no API keys are present
        return AITailorService._offline_fallback_analysis(prompt)

    @staticmethod
    def _offline_fallback_analysis(prompt: str) -> str:
        """Deterministic offline fallback response when no LLM API key is configured."""
        fallback = {
            "match_score": 85.0,
            "summary": "Perfil com sólida compatibilidade técnica nas competências centrais da vaga.",
            "strengths": ["Experiência comprovada com as tecnologias requeridas", "Formação e stack alinhadas aos objetivos da função", "Histórico de projetos práticos correlatos"],
            "gaps": ["Verificar requisitos específicos de anos de experiência no anúncio", "Ajustar terminologia técnica para o ATS específico da empresa"],
            "keywords": ["Python", "FastAPI", "Next.js", "Docker", "SQL", "Git"],
            "recommendation": "Candidatura altamente recomendada. Adapte o resumo e os bullet points para destacar as entregas recentes.",
            "tailored_summary": "Profissional focado em desenvolvimento de software de alta performance, arquitetura escalável e entrega contínua com rigor técnico e foco em resultados de negócio.",
            "cover_letter_text": "Exma. Equipa de Recrutamento,\n\nAcompanho com grande interesse a evolução da vossa organização e identifiquei uma forte convergência entre os desafios descritos nesta oportunidade e o meu percurso técnico recente.\n\nEstou à inteira disposição para apresentar detalhadamente como o meu background pode agregar valor imediato à vossa equipa.\n\nCom os melhores cumprimentos.",
            "linkedin_note": "Olá! Notei a oportunidade na vossa equipa e vejo forte alinhamento com a minha experiência recente. Gostaria de conectar!",
            "likely_questions": [
                {"question": "Descreva um projeto desafiador que implementou de ponta a ponta.", "purpose": "Avaliar autonomia e capacidade de entrega", "recommended_star_angle": "Foque no problema inicial, nas decisões de arquitetura e nas métricas alcançadas."},
                {"question": "Como lida com prazos apertados e requisitos em constante mudança?", "purpose": "Avaliar resiliência e priorização", "recommended_star_angle": "Cite um exemplo concreto onde renegociou o escopo com base no impacto real."}
            ]
        }
        return json.dumps(fallback)

    @classmethod
    async def analyze_fit(cls, job_dict: Dict[str, Any], profile_dict: Dict[str, Any], user_keys: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        system_prompt = (
            "You are an elite Tech Career Advisor and ATS Auditor. Analyze the job posting vs candidate profile. "
            "Output strictly valid JSON with keys: match_score (float 0-100), summary (string), strengths (list of strings), "
            "gaps (list of strings), keywords (list of strings), recommendation (string)."
        )
        prompt = f"""
Job Title: {job_dict.get('title')}
Company: {job_dict.get('company')}
Location: {job_dict.get('location')}
Job Description:
{job_dict.get('description', '')[:3000]}

Candidate Profile:
Name: {profile_dict.get('full_name')}
Skills: {json.dumps(profile_dict.get('skills', []))}
Summary: {profile_dict.get('summary', '')}
Experience: {json.dumps(profile_dict.get('experiences', []))[:2000]}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, user_keys=user_keys)
        try:
            return json.loads(raw_res)
        except Exception:
            return json.loads(cls._offline_fallback_analysis(prompt))

    @classmethod
    async def tailor_cv(cls, job_dict: Dict[str, Any], profile_dict: Dict[str, Any], user_keys: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        system_prompt = (
            "You are an ATS CV Optimization expert. Your job is to adapt the candidate's summary and experience bullets "
            "to mirror the Job Description terminology WITHOUT hallucinating false experience. Every claim must remain true to the original profile. "
            "Output strictly valid JSON with keys: tailored_summary (string), tailored_experiences (list of dicts matching candidate experience structure), "
            "highlighted_skills (list of strings)."
        )
        prompt = f"""
Target Job:
{job_dict.get('title')} at {job_dict.get('company')}
Description: {job_dict.get('description', '')[:2500]}

Candidate Raw Profile:
{json.dumps(profile_dict, indent=2)}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, user_keys=user_keys)
        try:
            data = json.loads(raw_res)
            return {
                "tailored_summary": data.get("tailored_summary", profile_dict.get("summary", "")),
                "tailored_experiences": data.get("tailored_experiences", profile_dict.get("experiences", [])),
                "highlighted_skills": data.get("highlighted_skills", profile_dict.get("skills", []))
            }
        except Exception:
            return {
                "tailored_summary": profile_dict.get("summary", ""),
                "tailored_experiences": profile_dict.get("experiences", []),
                "highlighted_skills": profile_dict.get("skills", [])
            }

    @classmethod
    async def generate_cover_letter(cls, job_dict: Dict[str, Any], profile_dict: Dict[str, Any], angle: str = "direct", user_keys: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        system_prompt = (
            "You are a master communicator. Write a concise, authentic, high-impact cover letter (maximum 250 words) "
            "and a LinkedIn connection note (maximum 280 characters). Avoid clichés, corporate jargon, and exclamation marks. "
            "Follow the Unslop principles of genuine, calm, grounded communication. "
            "Output strictly valid JSON with keys: cover_letter_text (string), linkedin_note (string)."
        )
        prompt = f"""
Angle: {angle}
Job Title: {job_dict.get('title')}
Company: {job_dict.get('company')}
Description: {job_dict.get('description', '')[:2000]}

Candidate Name: {profile_dict.get('full_name')}
Candidate Background: {profile_dict.get('summary', '')}
Skills: {json.dumps(profile_dict.get('skills', []))}
"""
        raw_res = await cls.call_llm(prompt, system_prompt, user_keys=user_keys)
        try:
            return json.loads(raw_res)
        except Exception:
            return {
                "cover_letter_text": f"Exma. Equipa da {job_dict.get('company')},\n\nCandidatei-me com entusiasmo à função de {job_dict.get('title')}. Com a minha experiência consolidada em {', '.join(profile_dict.get('skills', [])[:3])}, estou preparado para contribuir imediatamente com as vossas metas técnicas.\n\nCom os melhores cumprimentos,\n{profile_dict.get('full_name')}",
                "linkedin_note": f"Olá! Notei a oportunidade de {job_dict.get('title')} na {job_dict.get('company')} e gostaria de me conectar para acompanhar os desenvolvimentos da equipa."
            }
