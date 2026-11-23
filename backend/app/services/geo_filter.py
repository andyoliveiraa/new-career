import math
import httpx
from typing import Optional, Tuple, Dict
import logging

logger = logging.getLogger(__name__)

# Cache for coordinates so we don't spam Nominatim
COORDS_CACHE: Dict[str, Optional[Tuple[float, float]]] = {
    "lisboa": (38.7223, -9.1393),
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
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0 # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def get_city_coordinates(city_name: str) -> Optional[Tuple[float, float]]:
    """Geocode city name with Nominatim OpenStreetMap (with cache)."""
    norm = city_name.strip().lower()
    if norm in COORDS_CACHE:
        return COORDS_CACHE[norm]
    
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "NewCareer-App/1.0 (job-distance-calculator)"}
    params = {"q": f"{city_name}, Portugal", "format": "json", "limit": 1}
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                    COORDS_CACHE[norm] = (lat, lon)
                    return (lat, lon)
    except Exception as e:
        logger.warning(f"Error geocoding {city_name}: {e}")
    
    COORDS_CACHE[norm] = None
    return None

async def calculate_job_distance(job_location: Optional[str], target_city: str) -> Optional[float]:
    """Calculate distance in km between a job location and target city."""
    if not job_location:
        return None
    
    if "remot" in job_location.lower() or "teletrabalho" in job_location.lower() or "anywhere" in job_location.lower():
        return 0.0
    
    target_coords = await get_city_coordinates(target_city)
    if not target_coords:
        return None
    
    # Check if target city is mentioned directly in job location
    if target_city.lower() in job_location.lower():
        return 0.0
    
    job_coords = await get_city_coordinates(job_location)
    if not job_coords:
        return None
    
    return round(haversine_distance(target_coords[0], target_coords[1], job_coords[0], job_coords[1]), 1)
