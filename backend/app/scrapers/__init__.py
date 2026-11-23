from backend.app.scrapers.base import BaseScraper
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.scrapers.google_jobs import GoogleJobsScraper
from backend.app.scrapers.jobspy_scraper import JobSpyScraper
from backend.app.scrapers.ats_portals import ATSPortalsScraper

__all__ = [
    "BaseScraper",
    "NetEmpregosScraper",
    "GoogleJobsScraper",
    "JobSpyScraper",
    "ATSPortalsScraper"
]
