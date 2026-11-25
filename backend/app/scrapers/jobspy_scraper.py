import asyncio
from typing import List, Dict, Any, Optional
import hashlib
import logging
from backend.app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

class JobSpyScraper(BaseScraper):
    def __init__(self, sites: Optional[List[str]] = None):
        # Default sites: linkedin, indeed, glassdoor
        self.sites = sites or ["linkedin", "indeed", "glassdoor"]

    @property
    def source_name(self) -> str:
        return "jobspy"

    async def search(self, query: str, location: Optional[str] = None, limit: int = 25) -> List[Dict[str, Any]]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._scrape_sync, query, location, limit)

    def _scrape_sync(self, query: str, location: Optional[str], limit: int) -> List[Dict[str, Any]]:
        try:
            from jobspy import scrape_jobs
            
            country_val = "Portugal" if (not location or "portugal" in location.lower()) else "USA"
            effective_term = (query or "").strip() or ("emprego" if country_val == "Portugal" else "jobs")
            
            jobs_df = scrape_jobs(
                site_name=self.sites,
                search_term=effective_term,
                location=location or "Lisboa, Portugal",
                results_wanted=limit,
                country_indeed=country_val,
                hours_old=168 # 7 days
            )
            
            if jobs_df is None or jobs_df.empty:
                return []
            
            jobs = []
            for _, row in jobs_df.iterrows():
                title = str(row.get("title") or "Sem título")
                company = str(row.get("company") or "Confidencial")
                job_url = str(row.get("job_url") or "")
                site = str(row.get("site") or "jobspy")
                
                if not job_url or job_url == "nan":
                    continue
                
                job_key = hashlib.sha256(f"{site}:{job_url}".encode()).hexdigest()[:24]
                
                jobs.append({
                    "job_key": job_key,
                    "title": title,
                    "company": company,
                    "location": str(row.get("location") or location or "Portugal"),
                    "is_remote": bool(row.get("is_remote", False)),
                    "salary": str(row.get("min_amount") or "") if row.get("min_amount") else None,
                    "description": str(row.get("description") or "") if row.get("description") else None,
                    "url": job_url,
                    "source": site.lower(),
                    "raw_metadata": {
                        "job_type": str(row.get("job_type") or ""),
                        "emails": str(row.get("emails") or "")
                    }
                })
            return jobs
        except Exception as e:
            logger.warning(f"JobSpy scraping error: {e}")
            return []
