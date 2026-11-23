import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
import hashlib
from datetime import datetime
import logging
from backend.app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)

class NetEmpregosScraper(BaseScraper):
    @property
    def source_name(self) -> str:
        return "netempregos"

    async def search(self, query: str, location: Optional[str] = None, limit: int = 25) -> List[Dict[str, Any]]:
        jobs = []
        base_url = "https://www.net-empregos.com/pesquisa-empregos.asp"
        
        # Prepare query parameters
        params = {"chaves": query}
        if location and location.lower() != "remoto":
            params["cidade"] = location
            
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8"
        }

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(base_url, params=params, headers=headers)
                resp.encoding = "iso-8859-1"
                
                if resp.status_code != 200:
                    logger.warning(f"Net-Empregos search returned HTTP {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")
                items = soup.select(".job-item.media")
                
                for item in items[:limit]:
                    try:
                        title_el = item.select_one("a.oferta-link")
                        if not title_el:
                            continue
                        
                        title = title_el.text.strip()
                        raw_href = title_el.get("href", "")
                        if not raw_href.startswith("http"):
                            job_url = f"https://www.net-empregos.com{raw_href}"
                        else:
                            job_url = raw_href
                            
                        # Extract company, date and location
                        # Format is usually: Title | Date | Location | Category | Company | Ver Oferta
                        text_parts = [p.strip() for p in item.get_text(separator="|").split("|") if p.strip()]
                        
                        job_date_str = None
                        job_location = location or "Portugal"
                        company = "Confidencial"
                        
                        if len(text_parts) >= 5:
                            job_date_str = text_parts[1]
                            job_location = text_parts[2]
                            company = text_parts[4]
                        
                        # Generate deterministic key
                        key_str = f"netempregos:{job_url}"
                        job_key = hashlib.sha256(key_str.encode()).hexdigest()[:24]

                        is_remote = "remot" in title.lower() or "teletrabalho" in title.lower() or "remot" in job_location.lower()

                        job_dict = {
                            "job_key": job_key,
                            "title": title,
                            "company": company,
                            "location": job_location,
                            "is_remote": is_remote,
                            "salary": None,
                            "description": None, # Fetched on demand or populated from summary
                            "url": job_url,
                            "source": self.source_name,
                            "raw_metadata": {
                                "raw_href": raw_href,
                                "date_text": job_date_str,
                                "category": text_parts[3] if len(text_parts) >= 4 else None
                            }
                        }
                        jobs.append(job_dict)

                    except Exception as parse_err:
                        logger.warning(f"Failed to parse Net-Empregos row: {parse_err}")

        except Exception as e:
            logger.error(f"Error fetching Net-Empregos: {e}")

        return jobs

    async def fetch_job_description(self, job_url: str) -> Optional[str]:
        """Fetch the full description of a Net-Empregos posting."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                res = await client.get(job_url, headers=headers)
                res.encoding = "iso-8859-1"
                if res.status_code == 200:
                    soup = BeautifulSoup(res.text, "html.parser")
                    desc = soup.select_one(".job-description, .anuncio-descricao, #descricao-oferta, .col-lg-8")
                    if desc:
                        return desc.get_text(separator="\n", strip=True)
        except Exception as e:
            logger.warning(f"Error fetching Net-Empregos details for {job_url}: {e}")
        return None
