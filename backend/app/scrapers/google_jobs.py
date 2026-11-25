import hashlib
import logging
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings
from backend.app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


class GoogleJobsScraper(BaseScraper):
    @property
    def source_name(self) -> str:
        return "google"

    async def search(
        self,
        query: str,
        location: Optional[str] = None,
        limit: int = 25,
        serpapi_key: Optional[str] = None,
        jsearch_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        loc = location or settings.DEFAULT_COUNTRY
        clean_q = (query or "").strip()
        full_query = f"{clean_q} em {loc}" if (clean_q and loc) else (clean_q or f"emprego em {loc}")

        effective_serp = serpapi_key or settings.SERPAPI_API_KEY
        if effective_serp:
            try:
                serp_jobs = await self._search_serpapi(full_query, loc, limit, effective_serp)
                if serp_jobs:
                    return serp_jobs
            except Exception as e:
                logger.warning(f"SerpApi Google Jobs failed: {e}")

        effective_jsearch = jsearch_key or settings.JSEARCH_API_KEY
        if effective_jsearch:
            try:
                jsearch_jobs = await self._search_jsearch(full_query, limit, effective_jsearch)
                if jsearch_jobs:
                    return jsearch_jobs
            except Exception as e:
                logger.warning(f"JSearch Google Jobs failed: {e}")

        return []

    async def _search_serpapi(self, query: str, location: str, limit: int, api_key: str) -> List[Dict[str, Any]]:
        url = "https://serpapi.com/search.json"
        params = {
            "engine": "google_jobs",
            "q": query,
            "location": location,
            "hl": "pt",
            "gl": "pt",
            "api_key": api_key
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("jobs_results", [])
                jobs = []
                for item in results[:limit]:
                    job_id = item.get("job_id", "")
                    job_url = item.get("share_link") or (
                        item.get("related_links", [{}])[0].get("link") if item.get("related_links") else ""
                    )
                    if not job_url:
                        job_url = f"https://www.google.com/search?q={query}&ibp=htl;jobs#fpstate=tldetail&htidocid={job_id}"

                    job_key = hashlib.sha256(f"google:{job_id or job_url}".encode()).hexdigest()[:24]
                    jobs.append({
                        "job_key": job_key,
                        "title": item.get("title", "Sem título"),
                        "company": item.get("company_name", "Confidencial"),
                        "location": item.get("location", location),
                        "is_remote": "remote" in (item.get("location", "") + item.get("title", "")).lower(),
                        "salary": item.get("detected_extensions", {}).get("salary"),
                        "description": item.get("description"),
                        "url": job_url,
                        "source": self.source_name,
                        "raw_metadata": item
                    })
                return jobs
        return []

    async def _search_jsearch(self, query: str, limit: int, api_key: str) -> List[Dict[str, Any]]:
        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "x-rapidapi-key": api_key,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        params = {"query": query, "page": "1", "num_pages": "1"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("data", [])
                jobs = []
                for item in results[:limit]:
                    job_id = item.get("job_id", "")
                    job_url = item.get("job_apply_link") or item.get("job_google_link") or ""
                    job_key = hashlib.sha256(f"jsearch:{job_id or job_url}".encode()).hexdigest()[:24]
                    jobs.append({
                        "job_key": job_key,
                        "title": item.get("job_title", "Sem título"),
                        "company": item.get("employer_name", "Confidencial"),
                        "location": f"{item.get('job_city', '')}, {item.get('job_country', '')}".strip(", "),
                        "is_remote": item.get("job_is_remote", False),
                        "salary": item.get("job_salary"),
                        "description": item.get("job_description"),
                        "url": job_url,
                        "source": self.source_name,
                        "raw_metadata": item
                    })
                return jobs
        return []
