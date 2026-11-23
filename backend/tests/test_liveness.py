import pytest
from backend.app.services.liveness import (
    extract_greenhouse_params,
    extract_lever_params,
    extract_ashby_params,
    extract_linkedin_id,
    LivenessService
)

def test_extract_greenhouse_params():
    url = "https://boards.greenhouse.io/anthropic/jobs/4023412"
    params = extract_greenhouse_params(url)
    assert params is not None
    assert params["board"] == "anthropic"
    assert params["job_id"] == "4023412"

def test_extract_lever_params():
    url = "https://jobs.lever.co/stripe/687a6c9e-5c42-4f0e-b7d8-123456789abc"
    params = extract_lever_params(url)
    assert params is not None
    assert params["site"] == "stripe"
    assert params["posting_id"] == "687a6c9e-5c42-4f0e-b7d8-123456789abc"

def test_extract_ashby_params():
    url = "https://jobs.ashbyhq.com/linear/5b739669-7c85-48b0-8f92-ec2fe365a657"
    params = extract_ashby_params(url)
    assert params is not None
    assert params["org"] == "linear"

def test_extract_linkedin_id():
    url = "https://www.linkedin.com/jobs/view/4102938475/"
    job_id = extract_linkedin_id(url)
    assert job_id == "4102938475"

@pytest.mark.asyncio
async def test_liveness_check_404():
    # A known non-existent URL should return expired or uncertain
    res = await LivenessService.check_liveness("https://httpbin.org/status/404")
    assert res["status"] in ("expired", "uncertain")
