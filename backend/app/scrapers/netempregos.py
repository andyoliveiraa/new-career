import asyncio
import hashlib
import html as html_lib
import logging
import re
import unicodedata
import urllib.parse
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


def _slugify_location(value: str) -> str:
    cleaned = _normalize_text(value)
    return re.sub(r"[^a-z0-9]+", "-", cleaned).strip("-")


# Map Portuguese municipalities/cities to their Net-Empregos district (Zona) & nearby hubs
PT_CITY_TO_REGION: Dict[str, tuple[str, ...]] = {
    "covilha": ("castelo branco", "fundao", "tortosendo", "belmonte"),
    "fundao": ("castelo branco", "covilha"),
    "cascais": ("lisboa", "oeiras", "sintra"),
    "sintra": ("lisboa", "oeiras", "cascais", "amadora"),
    "oeiras": ("lisboa", "cascais", "sintra"),
    "amadora": ("lisboa", "oeiras", "sintra"),
    "loures": ("lisboa", "odivelas"),
    "odivelas": ("lisboa", "loures"),
    "vila franca de xira": ("lisboa",),
    "torres vedras": ("lisboa",),
    "maia": ("porto", "matosinhos"),
    "matosinhos": ("porto", "maia", "vila nova de gaia"),
    "vila nova de gaia": ("porto", "matosinhos"),
    "gaia": ("porto", "matosinhos"),
    "gondomar": ("porto",),
    "valongo": ("porto",),
    "penafiel": ("porto",),
    "povoa de varzim": ("porto", "vila do conde"),
    "guimaraes": ("braga", "vila nova de famalicao", "vizela"),
    "famalicao": ("braga", "guimaraes"),
    "vila nova de famalicao": ("braga", "guimaraes"),
    "barcelos": ("braga",),
    "almada": ("setubal", "seixal", "barreiro"),
    "seixal": ("setubal", "almada", "barreiro"),
    "barreiro": ("setubal", "almada", "seixal"),
    "montijo": ("setubal", "alcochete"),
    "albufeira": ("faro", "loule", "portimao"),
    "portimao": ("faro", "lagoa", "lagos"),
    "loule": ("faro", "albufeira"),
    "lagos": ("faro", "portimao"),
    "tavira": ("faro",),
    "espinho": ("aveiro", "santa maria da feira"),
    "santa maria da feira": ("aveiro", "sao joao da madeira"),
    "sao joao da madeira": ("aveiro", "oliveira de azemeis"),
    "figueira da foz": ("coimbra",),
    "caldas da rainha": ("leiria", "obidos"),
    "marinha grande": ("leiria",),
    "pombal": ("leiria",),
    "tomar": ("santarem", "entroncamento"),
    "torres novas": ("santarem", "entroncamento"),
    "funchal": ("madeira",),
    "ponta delgada": ("acores",),
    "chaves": ("vila real",),
    "lamego": ("viseu",),
    "elvas": ("portalegre",),
    "mirandela": ("braganca",),
}


def _title_from_slug(url: str) -> str:
    """Turn a Net-Empregos offer URL slug into a readable title."""
    parts = [p for p in url.rstrip("/").split("/") if p]
    slug = parts[-1] if parts else ""
    words = [w for w in slug.split("-") if w]
    # Strip trailing internal reference IDs like 135-001440-1 or 324-000581-1
    if len(words) >= 3 and words[-1].isdigit() and words[-2].isdigit() and words[-3].isdigit():
        words = words[:-3]
    text = " ".join(words).strip()
    if not text:
        return "Oferta de Emprego"
    # Fix common Portuguese markers
    text = re.sub(r"\bm f\b", "(M/F)", text, flags=re.IGNORECASE)
    return text.title().replace("(M/F)", "(M/F)")


class NetEmpregosScraper(BaseScraper):
    BASE_URL = "https://www.net-empregos.com"
    RSS_URL = "https://www.net-empregos.com/rss.asp"
    SITEMAP_URL = "https://www.net-empregos.com/Sitemap.asp"

    @property
    def source_name(self) -> str:
        return "netempregos"

    async def search(
        self,
        query: Optional[str] = "",
        location: Optional[str] = None,
        limit: int = 25,
        max_pages: int = 3
    ) -> List[Dict[str, Any]]:
        clean_query = _normalize_text(query or "")
        raw_query = (query or "").strip()
        raw_location = (location or "").strip()
        clean_location = _normalize_text(raw_location)
        loc_slug = _slugify_location(raw_location)
        query_terms = [t for t in re.split(r"\s+", clean_query) if t]
        safe_max_pages = max(1, min(20, int(max_pages or 3)))

        if clean_location in ("portugal", "todas", "todas as zonas", "all"):
            clean_location = ""
            loc_slug = ""

        is_remote_search = clean_location in ("remoto", "remote", "teletrabalho")

        jobs: List[Dict[str, Any]] = []
        seen_urls = set()

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            # 1. Try direct Net-Empregos HTML pagination:
            #    - pesquisa-empregos.asp?page={n}&categoria=0&zona=0&tipo=0&cidade={iso_city}
            #    - /{cidade}/?page={n}
            if raw_location or raw_query:
                html_jobs = await self._scrape_paginated_html(
                    client=client,
                    raw_query=raw_query,
                    raw_location=raw_location,
                    loc_slug=loc_slug,
                    is_remote_search=is_remote_search,
                    query_terms=query_terms,
                    limit=limit,
                    max_pages=safe_max_pages,
                )
                for j in html_jobs:
                    if j["url"] not in seen_urls:
                        seen_urls.add(j["url"])
                        jobs.append(j)
                if len(jobs) >= limit:
                    return jobs[:limit]

            # 2. Fetch public RSS (1,000 latest jobs with full metadata) and Sitemap (5,000 job URLs)
            effective_feed_limit = min(limit, safe_max_pages * 25)
            rss_jobs, sitemap_jobs = await self._fetch_feeds(
                client=client,
                raw_location=raw_location,
                clean_location=clean_location,
                loc_slug=loc_slug,
                is_remote_search=is_remote_search,
                query_terms=query_terms,
                limit=effective_feed_limit,
            )

            for j in rss_jobs + sitemap_jobs:
                if j["url"] not in seen_urls:
                    seen_urls.add(j["url"])
                    jobs.append(j)
                    if len(jobs) >= limit:
                        break

            # 3. If exact city matches < limit, expand to the same Portuguese district / nearby hubs
            if len(jobs) < limit and clean_location and not is_remote_search:
                region_terms = PT_CITY_TO_REGION.get(clean_location, ())
                if region_terms:
                    remaining = min(limit - len(jobs), effective_feed_limit - len(jobs))
                    if remaining > 0:
                        reg_rss, reg_sm = await self._fetch_feeds(
                            client=client,
                            raw_location=raw_location,
                            clean_location=clean_location,
                            loc_slug=loc_slug,
                            is_remote_search=False,
                            query_terms=query_terms,
                            limit=remaining + len(seen_urls),
                            extra_locations=region_terms,
                        )
                        for j in reg_rss + reg_sm:
                            if j["url"] not in seen_urls:
                                seen_urls.add(j["url"])
                                jobs.append(j)
                                if len(jobs) >= limit:
                                    break

        return jobs[:limit]

    @staticmethod
    def _build_search_page_url(
        base_url: str,
        raw_query: str,
        raw_location: str,
        loc_slug: str,
        page_num: int,
        use_search_asp: bool,
    ) -> str:
        if use_search_asp:
            # Net-Empregos classic ASP expects iso-8859-1 percent-encoding (e.g. Covilhã -> Covilh%E3)
            parts = [f"page={page_num}", "categoria=0", "zona=0", "tipo=0"]
            if raw_query:
                parts.append("chaves=" + urllib.parse.quote(raw_query, encoding="iso-8859-1", errors="ignore"))
            if raw_location:
                parts.append("cidade=" + urllib.parse.quote(raw_location, encoding="iso-8859-1", errors="ignore"))
            return f"{base_url}/pesquisa-empregos.asp?" + "&".join(parts)
        return f"{base_url}/{loc_slug}/" if page_num == 1 else f"{base_url}/{loc_slug}/?page={page_num}"

    async def _scrape_paginated_html(
        self,
        client: httpx.AsyncClient,
        raw_query: str,
        raw_location: str,
        loc_slug: str,
        is_remote_search: bool,
        query_terms: List[str],
        limit: int,
        max_pages: int,
    ) -> List[Dict[str, Any]]:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
        }
        jobs: List[Dict[str, Any]] = []
        seen_urls = set()

        # Prefer pesquisa-empregos.asp (supports page=N, cidade, chaves); fallback to /{city_slug}/
        modes = [True]
        if loc_slug and not is_remote_search:
            modes.append(False)

        for use_search_asp in modes:
            mode_found = False
            for page_num in range(1, max_pages + 1):
                url = self._build_search_page_url(
                    self.BASE_URL, raw_query, raw_location, loc_slug, page_num, use_search_asp
                )
                try:
                    resp = await client.get(url, headers=headers)
                    resp.encoding = "iso-8859-1"
                    if resp.status_code != 200:
                        break
                    soup = BeautifulSoup(resp.text, "html.parser")
                    items = soup.select(".job-item.media")
                    if not items:
                        break

                    mode_found = True
                    for item in items:
                        title_el = item.select_one("a.oferta-link")
                        if not title_el:
                            continue
                        title = title_el.text.strip()
                        raw_href = title_el.get("href", "")
                        job_url = raw_href if raw_href.startswith("http") else f"{self.BASE_URL}{raw_href}"
                        if job_url in seen_urls:
                            continue

                        text_parts = [p.strip() for p in item.get_text(separator="|").split("|") if p.strip()]
                        job_date_str = text_parts[1] if len(text_parts) >= 5 else None
                        job_location = text_parts[2] if len(text_parts) >= 5 else (raw_location or "Portugal")
                        category = text_parts[3] if len(text_parts) >= 4 else None
                        company = text_parts[4] if len(text_parts) >= 5 else "Confidencial"

                        title_norm = _normalize_text(title)
                        is_remote = "remot" in title_norm or "teletrabalho" in title_norm
                        if raw_location and not is_remote_search and is_remote:
                            continue

                        if query_terms:
                            haystack = _normalize_text(f"{title} {company} {category or ''}")
                            if not all(term in haystack for term in query_terms):
                                continue

                        seen_urls.add(job_url)
                        job_key = hashlib.sha256(f"netempregos:{job_url}".encode()).hexdigest()[:24]
                        jobs.append({
                            "job_key": job_key,
                            "title": title,
                            "company": company,
                            "location": job_location,
                            "is_remote": is_remote,
                            "salary": None,
                            "description": None,
                            "url": job_url,
                            "source": self.source_name,
                            "raw_metadata": {"date_text": job_date_str, "category": category, "page": page_num},
                        })
                        if len(jobs) >= limit:
                            return jobs
                except Exception as e:
                    logger.debug(f"Paginated HTML scrape skipped for {url}: {e}")
                    break

            if mode_found:
                break

        return jobs

    async def _fetch_feeds(
        self,
        client: httpx.AsyncClient,
        raw_location: str,
        clean_location: str,
        loc_slug: str,
        is_remote_search: bool,
        query_terms: List[str],
        limit: int,
        extra_locations: tuple[str, ...] = (),
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; NewCareerBot/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml, text/plain;q=0.9, */*;q=0.8",
        }
        rss_jobs: List[Dict[str, Any]] = []
        sitemap_jobs: List[Dict[str, Any]] = []

        try:
            rss_resp, sm_resp = await asyncio.gather(
                client.get(self.RSS_URL, headers=headers),
                client.get(self.SITEMAP_URL, headers=headers),
                return_exceptions=True,
            )
        except Exception as e:
            logger.error(f"Error fetching Net-Empregos feeds: {e}")
            return [], []

        if not isinstance(rss_resp, Exception) and rss_resp.status_code == 200:
            try:
                rss_resp.encoding = "iso-8859-1"
                root = ET.fromstring(rss_resp.text)
                items = root.findall("./channel/item")
                dc_ns = "{https://purl.org/dc/elements/1.1/}creator"

                for item in items:
                    title = (item.findtext("title") or "").strip()
                    job_url = (item.findtext("link") or "").strip()
                    if not title or not job_url:
                        continue

                    creator = (item.findtext(dc_ns) or "").strip()
                    raw_desc = html_lib.unescape(item.findtext("description") or "")
                    parsed_meta = self._parse_rss_description(raw_desc, creator)

                    zona_raw = parsed_meta["zona"] or ""
                    job_location = parsed_meta["location"]
                    company = parsed_meta["company"]
                    category = parsed_meta["category"]
                    date_text = parsed_meta["date_text"]
                    description = parsed_meta["description"]

                    title_zone_norm = _normalize_text(f"{title} {zona_raw}")
                    is_remote = "remot" in title_zone_norm or "teletrabalho" in title_zone_norm
                    is_all_zones = "todas as zonas" in _normalize_text(zona_raw)

                    if clean_location:
                        if is_remote_search:
                            if not (is_remote or "remot" in _normalize_text(description) or "teletrabalho" in _normalize_text(description)):
                                continue
                        else:
                            # When searching a specific city, exclude remote-only & "( Todas as Zonas )" national spam
                            if is_remote or is_all_zones:
                                continue
                            zona_norm = _normalize_text(zona_raw)
                            title_norm = _normalize_text(title)
                            url_norm = _normalize_text(job_url)
                            loc_candidates = (clean_location,) + extra_locations
                            matched_loc = False
                            for cand in loc_candidates:
                                cand_slug = _slugify_location(cand)
                                if (
                                    cand in zona_norm
                                    or cand in title_norm
                                    or (cand_slug and re.search(rf"(?:^|-|/){re.escape(cand_slug)}(?:-|/|$)", url_norm))
                                ):
                                    matched_loc = True
                                    break
                            if not matched_loc:
                                continue

                    if query_terms:
                        search_haystack = _normalize_text(f"{title} {company} {category or ''} {description}")
                        if not all(term in search_haystack for term in query_terms):
                            continue

                    job_key = hashlib.sha256(f"netempregos:{job_url}".encode()).hexdigest()[:24]
                    rss_jobs.append({
                        "job_key": job_key,
                        "title": title,
                        "company": company,
                        "location": job_location,
                        "is_remote": is_remote,
                        "salary": None,
                        "description": description or None,
                        "url": job_url,
                        "source": self.source_name,
                        "raw_metadata": {"date_text": date_text, "category": category},
                    })
                    if len(rss_jobs) >= limit:
                        break
            except Exception as e:
                logger.warning(f"Error parsing Net-Empregos RSS: {e}")

        # Supplement with Sitemap.asp (last 5,000 offers) when city slug or query needs deeper history
        if len(rss_jobs) < limit and not isinstance(sm_resp, Exception) and sm_resp.status_code == 200:
            seen_rss = {j["url"] for j in rss_jobs}
            for line in sm_resp.text.splitlines():
                job_url = line.strip()
                if not job_url.startswith("http") or job_url in seen_rss:
                    continue
                url_norm = _normalize_text(job_url)

                if clean_location:
                    if is_remote_search:
                        if "remot" not in url_norm and "teletrabalho" not in url_norm:
                            continue
                    else:
                        if "remot" in url_norm or "teletrabalho" in url_norm:
                            continue
                        loc_candidates = (clean_location,) + extra_locations
                        matched_cand = next(
                            (
                                cand for cand in loc_candidates
                                if _slugify_location(cand)
                                and re.search(rf"(?:^|-|/){re.escape(_slugify_location(cand))}(?:-|/|$)", url_norm)
                            ),
                            None,
                        )
                        if not matched_cand:
                            continue
                    inferred_loc = raw_location or "Portugal"
                    if extra_locations and not is_remote_search and matched_cand and matched_cand != clean_location:
                        inferred_loc = matched_cand.title()
                else:
                    inferred_loc = raw_location or "Portugal"

                if query_terms:
                    slug_text = url_norm.replace("-", " ")
                    if not all(term in slug_text for term in query_terms):
                        continue

                title = _title_from_slug(job_url)
                job_key = hashlib.sha256(f"netempregos:{job_url}".encode()).hexdigest()[:24]
                sitemap_jobs.append({
                    "job_key": job_key,
                    "title": title,
                    "company": "Net-Empregos",
                    "location": inferred_loc,
                    "is_remote": is_remote_search,
                    "salary": None,
                    "description": None,
                    "url": job_url,
                    "source": self.source_name,
                    "raw_metadata": {"source_feed": "sitemap"},
                })
                if len(rss_jobs) + len(sitemap_jobs) >= limit:
                    break

        return rss_jobs, sitemap_jobs

    @staticmethod
    def _parse_rss_description(
        raw_desc: str,
        fallback_company: str,
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

        job_location = zona or "Portugal"
        if "todas as zonas" in _normalize_text(job_location):
            job_location = "Portugal"

        return {
            "company": company,
            "category": category,
            "zona": zona,
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
