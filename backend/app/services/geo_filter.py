import asyncio
import logging
import math
from typing import Dict, Optional, Tuple
import httpx
from backend.app.config import settings

logger = logging.getLogger(__name__)

MAX_CACHE_ENTRIES = 500
_GEO_LOCK = asyncio.Lock()

COORDS_CACHE: Dict[str, Optional[Tuple[float, float]]] = {
    "lisboa": (38.7223, -9.1393),
    "lisbon": (38.7223, -9.1393),
    "porto": (41.1579, -8.6291),
    "coimbra": (40.2033, -8.4103),
    "braga": (41.5454, -8.4265),
    "aveiro": (40.6405, -8.6538),
    "faro": (37.0194, -7.9304),
    "leiria": (39.7438, -8.8078),
    "setubal": (38.5244, -8.8882),
    "viseu": (40.6566, -7.9125),
    "guimaraes": (41.4425, -8.2918),
    "castelo branco": (39.8222, -7.4931),
    "covilha": (40.2826, -7.5033),
    "covilhã": (40.2826, -7.5033),
    "madrid": (40.4168, -3.7038),
    "london": (51.5072, -0.1276),
    "berlin": (52.5200, 13.4050),
    "paris": (48.8566, 2.3522),
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.0060),
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    earth_radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


async def get_city_coordinates(city_name: str) -> Optional[Tuple[float, float]]:
    """Geocode city name with Nominatim OpenStreetMap using a bounded cache."""
    norm = (city_name or "").strip().lower()
    if not norm:
        return None
    if norm in COORDS_CACHE:
        return COORDS_CACHE[norm]

    async with _GEO_LOCK:
        if norm in COORDS_CACHE:
            return COORDS_CACHE[norm]

        url = "https://nominatim.openstreetmap.org/search"
        headers = {"User-Agent": "NewCareer-App/1.1 (job-distance-calculator)"}
        search_query = city_name if "," in city_name else f"{city_name}, {settings.DEFAULT_COUNTRY}"
        params = {"q": search_query, "format": "json", "limit": 1}

        coords: Optional[Tuple[float, float]] = None
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if not data and "," not in city_name:
                        # Retry globally without default country suffix
                        resp = await client.get(url, params={"q": city_name, "format": "json", "limit": 1}, headers=headers)
                        if resp.status_code == 200:
                            data = resp.json()
                    if data:
                        coords = (float(data[0]["lat"]), float(data[0]["lon"]))
        except Exception as e:
            logger.warning(f"Error geocoding {city_name}: {e}")

        if len(COORDS_CACHE) >= MAX_CACHE_ENTRIES:
            COORDS_CACHE.clear()
        COORDS_CACHE[norm] = coords
        return coords


async def calculate_job_distance(job_location: Optional[str], target_city: str) -> Optional[float]:
    """Calculate distance in km between a job location and target city."""
    if not job_location:
        return None

    loc_lower = job_location.lower()
    if any(token in loc_lower for token in ("remot", "teletrabalho", "anywhere", "hybrid", "global")):
        return 0.0

    target_clean = (target_city or settings.DEFAULT_CITY).strip()
    if target_clean.lower() in loc_lower:
        return 0.0

    target_coords = await get_city_coordinates(target_clean)
    if not target_coords:
        return None

    job_coords = await get_city_coordinates(job_location)
    if not job_coords:
        return None

    return round(haversine_distance(target_coords[0], target_coords[1], job_coords[0], job_coords[1]), 1)
