import asyncio
import hashlib
import logging
from typing import Any, Dict, List, Optional
import httpx
from backend.app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

FEATURED_BOARDS = [
    {"company": "Anthropic", "type": "greenhouse", "board": "anthropic"},
    {"company": "Automattic", "type": "greenhouse", "board": "automattic"},
    {"company": "GitLab", "type": "greenhouse", "board": "gitlab"},
    {"company": "Figma", "type": "greenhouse", "board": "figma"},
    {"company": "Stripe", "type": "lever", "board": "stripe"},
    {"company": "Supabase", "type": "lever", "board": "supabase"},
    {"company": "Linear", "type": "ashby", "board": "linear"},
    {"company": "OpenAI", "type": "ashby", "board": "openai"},
]


class ATSPortalsScraper(BaseScraper):
    @property
    def source_name(self) -> str:
        return "careerops_ats"

    async def search(self, query: str, location: Optional[str] = None, limit: int = 30) -> List[Dict[str, Any]]:
        q_lower = (query or "").strip().lower()
        loc_lower = (location or "").strip().lower()

        async with httpx.AsyncClient(timeout=10.0) as client:
            tasks = [
                self._fetch_board(client, board, q_lower)
                for board in FEATURED_BOARDS
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        all_jobs: List[Dict[str, Any]] = []
        for res in results:
            if isinstance(res, list):
                all_jobs.extend(res)

        if loc_lower and loc_lower not in ("portugal", "global", ""):
            filtered = [
                j for j in all_jobs
                if loc_lower in (j.get("location") or "").lower()
                or j.get("is_remote")
                or (loc_lower in ("remoto", "remote") and j.get("is_remote"))
            ]
            if filtered:
                all_jobs = filtered

        return all_jobs[:limit]

    async def _fetch_board(self, client: httpx.AsyncClient, board: Dict[str, str], query: str) -> List[Dict[str, Any]]:
        try:
            if board["type"] == "greenhouse":
                return await self._fetch_greenhouse(client, board["company"], board["board"], query)
            if board["type"] == "lever":
                return await self._fetch_lever(client, board["company"], board["board"], query)
            if board["type"] == "ashby":
                return await self._fetch_ashby(client, board["company"], board["board"], query)
        except Exception as e:
            logger.warning(f"Error fetching ATS board {board['company']}: {e}")
        return []

    async def _fetch_greenhouse(self, client: httpx.AsyncClient, company: str, board: str, query: str) -> List[Dict[str, Any]]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"
        resp = await client.get(url)
        if resp.status_code != 200:
            return []

        data = resp.json()
        jobs = []
        for item in data.get("jobs", []):
            title = item.get("title", "")
            content = item.get("content") or ""
            if query and query not in title.lower() and query not in content.lower():
                continue

            job_id = str(item.get("id"))
            job_url = item.get("absolute_url")
            job_key = hashlib.sha256(f"greenhouse:{job_id}".encode()).hexdigest()[:24]
            loc_name = item.get("location", {}).get("name", "Remote / Global")

            jobs.append({
                "job_key": job_key,
                "title": title,
                "company": company,
                "location": loc_name,
                "is_remote": "remote" in loc_name.lower() or "anywhere" in loc_name.lower(),
                "salary": None,
                "description": content,
                "url": job_url,
                "source": "greenhouse",
                "raw_metadata": {"board": board, "job_id": job_id}
            })
        return jobs

    async def _fetch_lever(self, client: httpx.AsyncClient, company: str, board: str, query: str) -> List[Dict[str, Any]]:
        url = f"https://api.lever.co/v0/postings/{board}?mode=json"
        resp = await client.get(url)
        if resp.status_code != 200:
            return []

        data = resp.json()
        jobs = []
        for item in data:
            title = item.get("text", "")
            desc = item.get("descriptionPlain") or ""
            if query and query not in title.lower() and query not in desc.lower():
                continue

            job_id = str(item.get("id"))
            job_url = item.get("hostedUrl")
            job_key = hashlib.sha256(f"lever:{job_id}".encode()).hexdigest()[:24]
            loc_name = item.get("categories", {}).get("location", "Remote / Global")

            jobs.append({
                "job_key": job_key,
                "title": title,
                "company": company,
                "location": loc_name,
                "is_remote": "remote" in loc_name.lower() or "anywhere" in loc_name.lower(),
                "salary": None,
                "description": desc,
                "url": job_url,
                "source": "lever",
                "raw_metadata": {"board": board, "posting_id": job_id}
            })
        return jobs

    async def _fetch_ashby(self, client: httpx.AsyncClient, company: str, board: str, query: str) -> List[Dict[str, Any]]:
        url = f"https://api.ashbyhq.com/posting-api/job-board/{board}"
        resp = await client.get(url)
        if resp.status_code != 200:
            return []

        data = resp.json()
        jobs = []
        for item in data.get("jobs", []):
            title = item.get("title", "")
            desc = item.get("descriptionPlain") or item.get("descriptionHtml") or ""
            if query and query not in title.lower() and query not in desc.lower():
                continue

            job_id = str(item.get("id") or item.get("jobUrl", ""))
            job_url = item.get("jobUrl") or item.get("applyUrl") or ""
            if not job_url:
                continue
            job_key = hashlib.sha256(f"ashby:{job_id}".encode()).hexdigest()[:24]
            loc_name = item.get("location") or "Remote / Global"
            is_remote = bool(item.get("isRemote")) or "remote" in str(loc_name).lower()

            jobs.append({
                "job_key": job_key,
                "title": title,
                "company": company,
                "location": str(loc_name),
                "is_remote": is_remote,
                "salary": None,
                "description": desc,
                "url": job_url,
                "source": "ashby",
                "raw_metadata": {"board": board, "job_id": job_id}
            })
        return jobs
