import hashlib
import html as html_lib
import logging
import re
import unicodedata
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

from backend.app.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


def _normalize_text(value: str) -> str:
    """Lowercase and strip diacritics for accent-insensitive matching."""
    decomposed = unicodedata.normalize("NFKD", value or "")
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower().strip()


class NetEmpregosScraper(BaseScraper):
    RSS_URL = "https://www.net-empregos.com/rss.asp"

    @property
    def source_name(self) -> str:
        return "netempregos"

    async def search(
        self,
        query: Optional[str] = "",
        location: Optional[str] = None,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        clean_query = _normalize_text(query or "")
        clean_location = _normalize_text(location or "")
        query_terms = [t for t in re.split(r"\s+", clean_query) if t]

        if clean_location in ("portugal", "todas", "todas as zonas", "all"):
            clean_location = ""

        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; NewCareerBot/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        }

        jobs: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(self.RSS_URL, headers=headers)
                resp.encoding = "iso-8859-1"

                if resp.status_code != 200:
                    logger.warning(f"Net-Empregos RSS returned HTTP {resp.status_code}")
                    return []

                root = ET.fromstring(resp.text)
                items = root.findall("./channel/item")
                dc_ns = "{https://purl.org/dc/elements/1.1/}creator"

                for item in items:
                    title = (item.findtext("title") or "").strip()
                    job_url = (item.findtext("link") or "").strip()
                    if not title or not job_url:
                        continue

                    creator = (item.findtext(dc_ns) or "").strip()
                    raw_desc = html_lib.unescape(item.findtext("description") or "")
                    parsed_meta = self._parse_rss_description(raw_desc, creator, location)

                    job_location = parsed_meta["location"]
                    company = parsed_meta["company"]
                    category = parsed_meta["category"]
                    date_text = parsed_meta["date_text"]
                    description = parsed_meta["description"]

                    is_remote = any(
                        kw in _normalize_text(f"{title} {job_location} {description}")
                        for kw in ("remot", "teletrabalho", "hibrid", "hybrid")
                    )

                    # Location filter (optional; matches zone, title, or description)
                    if clean_location:
                        if clean_location in ("remoto", "remote", "teletrabalho"):
                            if not is_remote:
                                continue
                        else:
                            loc_haystack = _normalize_text(f"{job_location} {title} {description}")
                            if clean_location not in loc_haystack:
                                continue

                    # Keyword filter (optional; omitted when user searches only by location)
                    if query_terms:
                        search_haystack = _normalize_text(f"{title} {company} {category or ''} {description}")
                        if not all(term in search_haystack for term in query_terms):
                            continue

                    job_key = hashlib.sha256(f"netempregos:{job_url}".encode()).hexdigest()[:24]
                    jobs.append({
                        "job_key": job_key,
                        "title": title,
                        "company": company,
                        "location": job_location,
                        "is_remote": is_remote,
                        "salary": None,
                        "description": description or None,
                        "url": job_url,
                        "source": self.source_name,
                        "raw_metadata": {
                            "date_text": date_text,
                            "category": category,
                        },
                    })

                    if len(jobs) >= limit:
                        break

        except Exception as e:
            logger.error(f"Error fetching Net-Empregos RSS: {e}")

        return jobs

    @staticmethod
    def _parse_rss_description(
        raw_desc: str,
        fallback_company: str,
        fallback_location: Optional[str]
    ) -> Dict[str, Optional[str]]:
        soup = BeautifulSoup(raw_desc, "html.parser")
        plain = soup.get_text(" ", strip=True)

        def _extract_field(pattern: str) -> Optional[str]:
            m = re.search(pattern, plain, flags=re.IGNORECASE)
            return m.group(1).strip() if m else None

        company = _extract_field(r"Empresa:\s*(.*?)(?=\s+Categoria:|\s+Zona:|\s+Data:|$)") or fallback_company or "Confidencial"
        category = _extract_field(r"Categoria:\s*(.*?)(?=\s+Zona:|\s+Data:|$)")
        zona = _extract_field(r"Zona:\s*(.*?)(?=\s+Data:|\s+Descrição:|$)")
        date_text = _extract_field(r"Data:\s*([0-9\-/]+)")

        desc_split = re.split(r"Descrição:\s*", soup.get_text("\n", strip=True), maxsplit=1, flags=re.IGNORECASE)
        description = desc_split[1].strip() if len(desc_split) > 1 else plain

        job_location = zona or fallback_location or "Portugal"
        if job_location == "( Todas as Zonas )":
            job_location = fallback_location or "Portugal"

        return {
            "company": company,
            "category": category,
            "location": job_location,
            "date_text": date_text,
            "description": description,
        }

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
