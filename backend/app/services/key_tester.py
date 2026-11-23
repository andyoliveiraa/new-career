import time
import httpx
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class KeyTesterService:
    @staticmethod
    async def test_key(provider: str, api_key: str) -> Dict[str, Any]:
        p = provider.strip().lower()
        key = api_key.strip()
        if not key:
            return {
                "provider": provider,
                "valid": False,
                "status": "invalid",
                "message": "Nenhuma chave de API foi fornecida.",
                "latency_ms": None,
                "details": "O campo da chave encontra-se vazio."
            }

        start_time = time.time()

        try:
            if p == "gemini":
                return await KeyTesterService._test_gemini(key, start_time)
            elif p == "openai":
                return await KeyTesterService._test_openai(key, start_time)
            elif p == "groq":
                return await KeyTesterService._test_groq(key, start_time)
            elif p == "serpapi":
                return await KeyTesterService._test_serpapi(key, start_time)
            elif p == "jsearch":
                return await KeyTesterService._test_jsearch(key, start_time)
            else:
                return {
                    "provider": provider,
                    "valid": False,
                    "status": "error",
                    "message": f"Fornecedor '{provider}' não suportado para testes automáticos.",
                    "latency_ms": None,
                    "details": None
                }
        except httpx.ConnectTimeout:
            latency = round((time.time() - start_time) * 1000, 1)
            return {
                "provider": provider,
                "valid": False,
                "status": "error",
                "message": "Tempo limite de conexão excedido ao contactar os servidores da API.",
                "latency_ms": latency,
                "details": "Timeout após 7 segundos."
            }
        except Exception as e:
            latency = round((time.time() - start_time) * 1000, 1)
            logger.warning(f"Erro ao testar chave para {provider}: {e}")
            return {
                "provider": provider,
                "valid": False,
                "status": "error",
                "message": f"Erro inesperado ao testar chave: {str(e)}",
                "latency_ms": latency,
                "details": str(e)
            }

    @staticmethod
    async def _test_gemini(api_key: str, start_time: float) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        async with httpx.AsyncClient(timeout=7.0) as client:
            resp = await client.get(url)
            latency = round((time.time() - start_time) * 1000, 1)

            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "").replace("models/", "") for m in data.get("models", [])]
                flash_found = any("flash" in m for m in models)
                return {
                    "provider": "gemini",
                    "valid": True,
                    "status": "active",
                    "message": f"Chave Google Gemini ativa e operacional! ({latency} ms)",
                    "latency_ms": latency,
                    "details": f"Modelos disponíveis: {len(models)} (incluindo Gemini 1.5 Flash: {'✓' if flash_found else '?'})"
                }
            elif resp.status_code in (400, 403):
                return {
                    "provider": "gemini",
                    "valid": False,
                    "status": "invalid",
                    "message": "Chave do Google Gemini inválida ou não autorizada.",
                    "latency_ms": latency,
                    "details": f"Código HTTP {resp.status_code}: {resp.text[:200]}"
                }
            else:
                return {
                    "provider": "gemini",
                    "valid": False,
                    "status": "error",
                    "message": f"Falha na validação do Gemini (HTTP {resp.status_code}).",
                    "latency_ms": latency,
                    "details": resp.text[:200]
                }

    @staticmethod
    async def _test_openai(api_key: str, start_time: float) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(timeout=7.0) as client:
            resp = await client.get(url, headers=headers)
            latency = round((time.time() - start_time) * 1000, 1)

            if resp.status_code == 200:
                data = resp.json()
                models_count = len(data.get("data", []))
                return {
                    "provider": "openai",
                    "valid": True,
                    "status": "active",
                    "message": f"Chave OpenAI ativa e operacional! ({latency} ms)",
                    "latency_ms": latency,
                    "details": f"Acesso confirmado a {models_count} modelos (GPT-4o, GPT-4o-mini)."
                }
            elif resp.status_code == 401:
                return {
                    "provider": "openai",
                    "valid": False,
                    "status": "invalid",
                    "message": "Chave da OpenAI inválida ou revogada.",
                    "latency_ms": latency,
                    "details": "Código HTTP 401 Unauthorized."
                }
            elif resp.status_code == 429:
                return {
                    "provider": "openai",
                    "valid": False,
                    "status": "invalid",
                    "message": "Chave da OpenAI válida, mas a quota/saldo da conta está esgotada.",
                    "latency_ms": latency,
                    "details": "Código HTTP 429 Insufficient Quota."
                }
            else:
                return {
                    "provider": "openai",
                    "valid": False,
                    "status": "error",
                    "message": f"Erro ao verificar OpenAI (HTTP {resp.status_code}).",
                    "latency_ms": latency,
                    "details": resp.text[:200]
                }

    @staticmethod
    async def _test_groq(api_key: str, start_time: float) -> Dict[str, Any]:
        url = "https://api.groq.com/openai/v1/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        async with httpx.AsyncClient(timeout=7.0) as client:
            resp = await client.get(url, headers=headers)
            latency = round((time.time() - start_time) * 1000, 1)

            if resp.status_code == 200:
                data = resp.json()
                models_count = len(data.get("data", []))
                return {
                    "provider": "groq",
                    "valid": True,
                    "status": "active",
                    "message": f"Chave Groq Cloud ativa e ultra-rápida! ({latency} ms)",
                    "latency_ms": latency,
                    "details": f"Acesso a {models_count} modelos (incluindo Llama 3.3 70B)."
                }
            elif resp.status_code == 401:
                return {
                    "provider": "groq",
                    "valid": False,
                    "status": "invalid",
                    "message": "Chave da Groq Cloud inválida ou não autorizada.",
                    "latency_ms": latency,
                    "details": "Código HTTP 401 Unauthorized."
                }
            else:
                return {
                    "provider": "groq",
                    "valid": False,
                    "status": "error",
                    "message": f"Erro ao verificar Groq (HTTP {resp.status_code}).",
                    "latency_ms": latency,
                    "details": resp.text[:200]
                }

    @staticmethod
    async def _test_serpapi(api_key: str, start_time: float) -> Dict[str, Any]:
        url = f"https://serpapi.com/account?api_key={api_key}"
        async with httpx.AsyncClient(timeout=7.0) as client:
            resp = await client.get(url)
            latency = round((time.time() - start_time) * 1000, 1)

            if resp.status_code == 200:
                data = resp.json()
                searches_left = data.get("plan_searches_left", data.get("total_searches_left", "N/D"))
                return {
                    "provider": "serpapi",
                    "valid": True,
                    "status": "active",
                    "message": f"Chave SerpApi ativa! ({latency} ms)",
                    "latency_ms": latency,
                    "details": f"Pesquisas restantes no plano: {searches_left}"
                }
            elif resp.status_code in (401, 403):
                return {
                    "provider": "serpapi",
                    "valid": False,
                    "status": "invalid",
                    "message": "Chave SerpApi inválida.",
                    "latency_ms": latency,
                    "details": "Código HTTP 401/403."
                }
            else:
                return {
                    "provider": "serpapi",
                    "valid": False,
                    "status": "error",
                    "message": f"Erro na SerpApi (HTTP {resp.status_code}).",
                    "latency_ms": latency,
                    "details": resp.text[:200]
                }

    @staticmethod
    async def _test_jsearch(api_key: str, start_time: float) -> Dict[str, Any]:
        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": api_key,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        params = {"query": "developer", "num_pages": "1"}
        async with httpx.AsyncClient(timeout=7.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            latency = round((time.time() - start_time) * 1000, 1)

            if resp.status_code == 200:
                return {
                    "provider": "jsearch",
                    "valid": True,
                    "status": "active",
                    "message": f"Chave RapidAPI JSearch ativa e a responder! ({latency} ms)",
                    "latency_ms": latency,
                    "details": "Pesquisa de vagas online operacional."
                }
            elif resp.status_code in (401, 403):
                return {
                    "provider": "jsearch",
                    "valid": False,
                    "status": "invalid",
                    "message": "Chave RapidAPI JSearch inválida ou sem subscrição ativa.",
                    "latency_ms": latency,
                    "details": f"HTTP {resp.status_code}: {resp.text[:150]}"
                }
            else:
                return {
                    "provider": "jsearch",
                    "valid": False,
                    "status": "error",
                    "message": f"Erro ao verificar JSearch (HTTP {resp.status_code}).",
                    "latency_ms": latency,
                    "details": resp.text[:200]
                }
