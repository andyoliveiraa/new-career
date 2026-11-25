import re
import httpx
from urllib.parse import urlparse
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

EXPIRED_MARKERS = [
    "esta oferta já não se encontra disponível",
    "oferta expirada",
    "vaga encerrada",
    "candidaturas encerradas",
    "no longer accepting applications",
    "this job is closed",
    "job posting has expired",
    "this position has been filled",
    "posting no longer active",
    "404 - page not found",
    "404 not found",
    "page not found"
]

def extract_greenhouse_params(url: str) -> Optional[Dict[str, str]]:
    """Match greenhouse job urls e.g. boards.greenhouse.io/{board}/jobs/{id}"""
    m = re.search(r'boards\.greenhouse\.io/([^/]+)/jobs/(\d+)', url)
    if m:
        return {"board": m.group(1), "job_id": m.group(2)}
    m = re.search(r'jobapp\.greenhouse\.io/([^/]+)/jobs/(\d+)', url)
    if m:
        return {"board": m.group(1), "job_id": m.group(2)}
    return None

def extract_lever_params(url: str) -> Optional[Dict[str, str]]:
    """Match lever job urls e.g. jobs.lever.co/{site}/{id}"""
    m = re.search(r'jobs\.lever\.co/([^/]+)/([a-f0-9\-]+)', url)
    if m:
        return {"site": m.group(1), "posting_id": m.group(2)}
    return None

def extract_ashby_params(url: str) -> Optional[Dict[str, str]]:
    """Match ashby job urls e.g. jobs.ashbyhq.com/{org}/{id}"""
    m = re.search(r'jobs\.ashbyhq\.com/([^/]+)/([a-f0-9\-]+)', url)
    if m:
        return {"org": m.group(1), "job_id": m.group(2)}
    return None

def extract_linkedin_id(url: str) -> Optional[str]:
    """Extract LinkedIn job id from url"""
    m = re.search(r'(?:jobs/view/|currentJobId=)(\d+)', url)
    if m:
        return m.group(1)
    return None

class LivenessService:
    @staticmethod
    async def check_liveness(url: str) -> Dict[str, Any]:
        """
        Two-rung check:
        1. ATS Direct JSON API (zero LLM tokens, fast, definitive)
        2. HTTP body inspection for closed markers
        """
        now = datetime.now(timezone.utc)
        
        # 1. Rung 1: ATS Public APIs
        # Greenhouse
        gh = extract_greenhouse_params(url)
        if gh:
            api_url = f"https://boards-api.greenhouse.io/v1/boards/{gh['board']}/jobs/{gh['job_id']}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.get(api_url)
                    if res.status_code == 200:
                        return {"status": "active", "reason": "Greenhouse API confirmed active (200)", "checked_at": now}
                    elif res.status_code in (404, 410):
                        return {"status": "expired", "reason": "Greenhouse API returned 404/410 (job removed)", "checked_at": now}
            except Exception as e:
                logger.warning(f"Greenhouse liveness error: {e}")

        # Lever
        lev = extract_lever_params(url)
        if lev:
            api_url = f"https://api.lever.co/v0/postings/{lev['site']}/{lev['posting_id']}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.get(api_url)
                    if res.status_code == 200:
                        return {"status": "active", "reason": "Lever API confirmed active (200)", "checked_at": now}
                    elif res.status_code in (404, 410):
                        return {"status": "expired", "reason": "Lever API returned 404/410 (posting removed)", "checked_at": now}
            except Exception as e:
                logger.warning(f"Lever liveness error: {e}")

        # Ashby
        ash = extract_ashby_params(url)
        if ash:
            api_url = f"https://api.ashbyhq.com/posting-api/job-board/{ash['org']}"
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.get(api_url)
                    if res.status_code == 200:
                        jobs_list = res.json().get("jobs", [])
                        found = any(ash["job_id"] in str(j.get("id", "")) or ash["job_id"] in str(j.get("jobUrl", "")) for j in jobs_list)
                        if found:
                            return {"status": "active", "reason": "Ashby API confirmed active (200)", "checked_at": now}
                        return {"status": "expired", "reason": "Ashby API: posting not listed on board", "checked_at": now}
            except Exception as e:
                logger.warning(f"Ashby liveness error: {e}")

        # LinkedIn Guest Endpoint
        li_id = extract_linkedin_id(url)
        if li_id:
            guest_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{li_id}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9,pt;q=0.8"
            }
            try:
                async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                    res = await client.get(guest_url, headers=headers)
                    if res.status_code in (404, 410):
                        return {"status": "expired", "reason": "LinkedIn posting returned 404/410", "checked_at": now}
                    body_lower = res.text.lower()
                    if "no longer accepting applications" in body_lower or "closed" in body_lower:
                        return {"status": "expired", "reason": "LinkedIn: no longer accepting applications", "checked_at": now}
                    if res.status_code == 200 and len(res.text) > 500:
                        return {"status": "active", "reason": "LinkedIn guest page active", "checked_at": now}
            except Exception as e:
                logger.warning(f"LinkedIn liveness check failed: {e}")

        # 2. Rung 2: Standard HTTP Content Inspection (Net-Empregos, Web Portals)
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                res = await client.get(url, headers=headers)
                
                # Check status code
                if res.status_code in (404, 410):
                    return {"status": "expired", "reason": f"HTTP status {res.status_code}", "checked_at": now}
                
                # Check if redirected back to portal home (common pattern in Net-Empregos)
                parsed_req = urlparse(url)
                parsed_final = urlparse(str(res.url))
                if "net-empregos.com" in parsed_req.netloc and parsed_final.path in ("", "/", "/index.asp", "/default.asp"):
                    return {"status": "expired", "reason": "Net-Empregos: oferta redirecionada para a página inicial", "checked_at": now}

                # Body text markers
                body_lower = res.text.lower()
                for marker in EXPIRED_MARKERS:
                    if marker in body_lower:
                        return {"status": "expired", "reason": f"Marcador de expiração encontrado: '{marker}'", "checked_at": now}

                if res.status_code == 200:
                    return {"status": "active", "reason": "Página acessível sem marcadores de encerramento", "checked_at": now}

        except Exception as e:
            logger.warning(f"HTTP liveness check error for {url}: {e}")
            return {"status": "uncertain", "reason": f"Falha de conexão: {str(e)}", "checked_at": now}

        return {"status": "uncertain", "reason": "Inconclusivo", "checked_at": now}
