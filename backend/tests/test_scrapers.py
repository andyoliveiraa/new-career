import pytest
from backend.app.scrapers.netempregos import NetEmpregosScraper
from backend.app.scrapers.ats_portals import ATSPortalsScraper

@pytest.mark.asyncio
async def test_netempregos_scraper_search():
    scraper = NetEmpregosScraper()
    jobs = await scraper.search(query="python", location="Lisboa", limit=3)
    assert isinstance(jobs, list)
    if jobs:
        job = jobs[0]
        assert "title" in job
        assert "company" in job
        assert "url" in job
        assert job["source"] == "netempregos"
        assert len(job["job_key"]) > 0

@pytest.mark.asyncio
async def test_ats_portals_scraper():
    scraper = ATSPortalsScraper()
    # Query for engineer on Anthropic/Automattic boards
    jobs = await scraper.search(query="engineer", limit=3)
    assert isinstance(jobs, list)
    if jobs:
        job = jobs[0]
        assert "title" in job
        assert "company" in job
        assert job["source"] in ("greenhouse", "lever")
