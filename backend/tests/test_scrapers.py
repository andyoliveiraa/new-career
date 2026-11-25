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
async def test_netempregos_scraper_location_only_without_query():
    scraper = NetEmpregosScraper()
    jobs = await scraper.search(query="", location="Covilhã", limit=5)
    assert isinstance(jobs, list)
    assert len(jobs) > 0
    assert all(j["source"] == "netempregos" for j in jobs)
    assert all(not j["is_remote"] for j in jobs)

    lisboa_jobs = await scraper.search(query="", location="Lisboa", limit=5)
    assert len(lisboa_jobs) > 0
    assert all(not j["is_remote"] for j in lisboa_jobs)


@pytest.mark.asyncio
async def test_netempregos_html_pagination_respects_max_pages():
    from unittest.mock import AsyncMock, MagicMock

    scraper = NetEmpregosScraper()
    url_p2 = scraper._build_search_page_url(
        scraper.BASE_URL, "", "Covilhã", "covilha", page_num=2, use_search_asp=True
    )
    assert url_p2 == "https://www.net-empregos.com/pesquisa-empregos.asp?page=2&categoria=0&zona=0&tipo=0&cidade=Covilh%E3"

    page1_html = """
    <div class="job-item media">
      <a class="oferta-link" href="/1001/vaga-um/">Vaga Um</a>
      <span>25-11-2026</span><span>Covilhã</span><span>IT</span><span>Empresa A</span>
    </div>
    """
    page2_html = """
    <div class="job-item media">
      <a class="oferta-link" href="/1002/vaga-dois/">Vaga Dois</a>
      <span>24-11-2026</span><span>Covilhã</span><span>IT</span><span>Empresa B</span>
    </div>
    """
    page3_html = """
    <div class="job-item media">
      <a class="oferta-link" href="/1003/vaga-tres/">Vaga Tres</a>
      <span>23-11-2026</span><span>Covilhã</span><span>IT</span><span>Empresa C</span>
    </div>
    """

    called_urls = []

    async def fake_get(url, headers=None):
        called_urls.append(url)
        resp = MagicMock()
        resp.status_code = 200
        if "page=1" in url:
            resp.text = page1_html
        elif "page=2" in url:
            resp.text = page2_html
        else:
            resp.text = page3_html
        return resp

    mock_client = MagicMock()
    mock_client.get = AsyncMock(side_effect=fake_get)

    jobs = await scraper._scrape_paginated_html(
        client=mock_client,
        raw_query="",
        raw_location="Covilhã",
        loc_slug="covilha",
        is_remote_search=False,
        query_terms=[],
        limit=25,
        max_pages=2,
    )
    assert len(jobs) == 2
    assert len(called_urls) == 2
    assert "page=1" in called_urls[0] and "cidade=Covilh%E3" in called_urls[0]
    assert "page=2" in called_urls[1] and "cidade=Covilh%E3" in called_urls[1]


def test_get_nearby_cities_within_km_radius():
    from backend.app.services.geo_filter import get_nearby_cities

    within_20 = get_nearby_cities("Covilhã", 20)
    assert "tortosendo" in within_20
    assert "fundao" in within_20
    assert "lisboa" not in within_20

    within_60 = get_nearby_cities("Covilhã", 60)
    assert "guarda" in within_60
    assert "castelo branco" in within_60
    assert "porto" not in within_60

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
