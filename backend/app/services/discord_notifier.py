import logging
import re
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

DISCORD_WEBHOOK_PATTERN = re.compile(
    r"^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$"
)

STATUS_LABELS = {
    "disponivel": "Disponível",
    "avaliada": "Avaliada",
    "em_preparacao": "Em Preparação",
    "candidatado": "Candidatado",
    "entrevista": "Entrevista Agendada",
    "positiva": "Oferta / Positiva",
    "negativa": "Negativa",
    "descartada": "Descartada"
}


class DiscordNotificationService:
    @staticmethod
    def is_valid_webhook_url(url: Optional[str]) -> bool:
        if not url:
            return False
        return bool(DISCORD_WEBHOOK_PATTERN.match(url.strip()))

    @staticmethod
    async def send_test_notification(webhook_url: str, user_name: Optional[str] = None) -> Dict[str, Any]:
        url = webhook_url.strip() if webhook_url else ""
        if not DiscordNotificationService.is_valid_webhook_url(url):
            return {
                "success": False,
                "message": "URL de Webhook inválido. Certifique-se de que começa por https://discord.com/api/webhooks/...",
                "latency_ms": None
            }

        start_time = time.time()
        payload = {
            "username": "New Career Alertas",
            "avatar_url": "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/briefcase.png",
            "embeds": [
                {
                    "title": "Notificações New Career Conectadas",
                    "description": "O seu webhook do Discord foi verificado com sucesso e está operacional.",
                    "color": 2450411,
                    "fields": [
                        {
                            "name": "Utilizador",
                            "value": user_name or "Utilizador New Career",
                            "inline": True
                        },
                        {
                            "name": "Estado",
                            "value": "Conectado & Ativo",
                            "inline": True
                        },
                        {
                            "name": "Funcionalidades",
                            "value": "• Alertas automáticos de novas vagas\n• Notificações de avanço de entrevistas\n• Resumos de liveness check",
                            "inline": False
                        }
                    ],
                    "footer": {
                        "text": "New Career • Plataforma Inteligente de Emprego & AI Career Ops"
                    }
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, json=payload)
                latency = round((time.time() - start_time) * 1000, 1)

                if resp.status_code in (200, 204):
                    return {
                        "success": True,
                        "message": f"Mensagem de teste enviada com sucesso para o canal do Discord! ({latency} ms)",
                        "latency_ms": latency
                    }
                elif resp.status_code == 404:
                    return {
                        "success": False,
                        "message": "Webhook não encontrado no Discord. O canal ou webhook pode ter sido eliminado.",
                        "latency_ms": latency
                    }
                elif resp.status_code == 401:
                    return {
                        "success": False,
                        "message": "Token de autenticação do Webhook inválido.",
                        "latency_ms": latency
                    }
                else:
                    return {
                        "success": False,
                        "message": f"Erro do Discord (HTTP {resp.status_code}): {resp.text[:150]}",
                        "latency_ms": latency
                    }
        except httpx.ConnectTimeout:
            latency = round((time.time() - start_time) * 1000, 1)
            return {
                "success": False,
                "message": "Tempo limite esgotado ao contactar a API do Discord.",
                "latency_ms": latency
            }
        except Exception as e:
            latency = round((time.time() - start_time) * 1000, 1)
            logger.error(f"Erro ao disparar webhook do Discord: {e}")
            return {
                "success": False,
                "message": f"Falha ao enviar mensagem de teste: {str(e)}",
                "latency_ms": latency
            }

    @staticmethod
    async def send_new_jobs_notification(
        webhook_url: str,
        jobs: List[Dict[str, Any]],
        query: str,
        location: Optional[str] = None
    ) -> bool:
        if not DiscordNotificationService.is_valid_webhook_url(webhook_url) or not jobs:
            return False

        top_jobs = jobs[:5]
        fields = []
        for j in top_jobs:
            title = j.get("title", "Vaga sem título")
            company = j.get("company", "Empresa")
            loc = j.get("location") or ("Remoto" if j.get("is_remote") else "N/D")
            url = j.get("url", "#")
            salary = f" • Salário: {j.get('salary')}" if j.get("salary") else ""

            fields.append({
                "name": f"{title} — {company}",
                "value": f"Local: {loc}{salary}\n[Ver Oferta e Candidatar]({url})",
                "inline": False
            })

        payload = {
            "username": "New Career Radar",
            "avatar_url": "https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/radar.png",
            "embeds": [
                {
                    "title": f"{len(jobs)} Novas Vagas Encontradas",
                    "description": f"Varredura para **'{query}'** em **{location or 'Global/Remoto'}** identificou novas oportunidades:",
                    "color": 366217,
                    "fields": fields,
                    "footer": {
                        "text": f"New Career • {len(jobs)} novas oportunidades registadas na sua conta"
                    }
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(webhook_url.strip(), json=payload)
                return resp.status_code in (200, 204)
        except Exception as e:
            logger.warning(f"Falha ao enviar alerta de novas vagas no Discord: {e}")
            return False

    @staticmethod
    async def send_status_change_notification(
        webhook_url: str,
        job_title: str,
        company: str,
        new_status: str,
        job_url: Optional[str] = None
    ) -> bool:
        if not DiscordNotificationService.is_valid_webhook_url(webhook_url):
            return False

        status_label = STATUS_LABELS.get(new_status, new_status)
        color = 366217 if new_status == "positiva" else (9064446 if new_status == "entrevista" else 2450411)
        desc = f"A candidatura para **{job_title}** na **{company}** avançou para **{status_label}**."
        if job_url:
            desc += f"\n[Abrir Oferta]({job_url})"

        payload = {
            "username": "New Career Pipeline",
            "embeds": [
                {
                    "title": f"Atualização de Candidatura: {status_label}",
                    "description": desc,
                    "color": color,
                    "footer": {"text": "New Career • Pipeline de Candidaturas"}
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(webhook_url.strip(), json=payload)
                return resp.status_code in (200, 204)
        except Exception as e:
            logger.warning(f"Falha ao enviar notificação de status para Discord: {e}")
            return False
