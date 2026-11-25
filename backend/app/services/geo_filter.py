import asyncio
import logging
import math
import unicodedata
from typing import Dict, List, Optional, Tuple
import httpx
from backend.app.config import settings

logger = logging.getLogger(__name__)

MAX_CACHE_ENTRIES = 500
_GEO_LOCK = asyncio.Lock()

# Static coordinates for major Portuguese cities & international hubs (fast in-memory Haversine)
PT_CITIES_COORDS: Dict[str, Tuple[float, float]] = {
    "lisboa": (38.7223, -9.1393),
    "sintra": (38.8029, -9.3817),
    "cascais": (38.6979, -9.4215),
    "oeiras": (38.6910, -9.3109),
    "amadora": (38.7538, -9.2308),
    "loures": (38.8309, -9.1684),
    "odivelas": (38.7927, -9.1839),
    "almada": (38.6790, -9.1569),
    "seixal": (38.6409, -9.1014),
    "barreiro": (38.6631, -9.0724),
    "setubal": (38.5244, -8.8882),
    "montijo": (38.7067, -8.9739),
    "torres vedras": (39.0911, -9.2586),
    "vila franca de xira": (38.9553, -8.9897),
    "porto": (41.1579, -8.6291),
    "vila nova de gaia": (41.1239, -8.6118),
    "matosinhos": (41.1821, -8.6891),
    "maia": (41.2357, -8.6199),
    "gondomar": (41.1444, -8.5322),
    "valongo": (41.1886, -8.4983),
    "penafiel": (41.2083, -8.2829),
    "povoa de varzim": (41.3804, -8.7609),
    "braga": (41.5454, -8.4265),
    "guimaraes": (41.4425, -8.2918),
    "vila nova de famalicao": (41.4079, -8.5198),
    "barcelos": (41.5388, -8.6151),
    "viana do castelo": (41.6918, -8.8344),
    "aveiro": (40.6405, -8.6538),
    "santa maria da feira": (40.9254, -8.5428),
    "sao joao da madeira": (40.9005, -8.4907),
    "espinho": (41.0072, -8.6413),
    "coimbra": (40.2033, -8.4103),
    "figueira da foz": (40.1508, -8.8618),
    "leiria": (39.7438, -8.8078),
    "marinha grande": (39.7478, -8.9323),
    "caldas da rainha": (39.4033, -9.1384),
    "pombal": (39.9163, -8.6281),
    "santarem": (39.2362, -8.6871),
    "tomar": (39.6020, -8.4152),
    "covilha": (40.2826, -7.5033),
    "tortosendo": (40.2375, -7.5214),
    "fundao": (40.1403, -7.5015),
    "belmonte": (40.3583, -7.3514),
    "guarda": (40.5373, -7.2658),
    "seia": (40.4201, -7.7034),
    "gouveia": (40.4936, -7.5931),
    "manteigas": (40.4028, -7.5394),
    "sabugal": (40.3514, -7.0911),
    "castelo branco": (39.8222, -7.4931),
    "idanha-a-nova": (39.9239, -7.2369),
    "proenca-a-nova": (39.7525, -7.9242),
    "serta": (39.8053, -8.0972),
    "oliveira do hospital": (40.3594, -7.8619),
    "mangualde": (40.6042, -7.7614),
    "viseu": (40.6566, -7.9125),
    "vila real": (41.3006, -7.7441),
    "chaves": (41.7402, -7.4688),
    "braganca": (41.8058, -6.7572),
    "evora": (38.5714, -7.9135),
    "beja": (38.0151, -7.8632),
    "portalegre": (39.2967, -7.4285),
    "elvas": (38.8815, -7.1628),
    "faro": (37.0194, -7.9304),
    "loule": (37.1378, -8.0235),
    "albufeira": (37.0891, -8.2479),
    "portimao": (37.1366, -8.5377),
    "lagos": (37.1028, -8.6730),
    "funchal": (32.6669, -16.9241),
    "ponta delgada": (37.7412, -25.6756),
}

COORDS_CACHE: Dict[str, Optional[Tuple[float, float]]] = {
    **PT_CITIES_COORDS,
    "lisbon": (38.7223, -9.1393),
    "covilhã": (40.2826, -7.5033),
    "madrid": (40.4168, -3.7038),
    "london": (51.5072, -0.1276),
    "berlin": (52.5200, 13.4050),
    "paris": (48.8566, 2.3522),
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.0060),
}


def _strip_accents(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value or "")
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch)).lower().strip()


def get_nearby_cities(target_city: str, max_distance_km: float) -> List[str]:
    """Return known Portuguese cities within max_distance_km of target_city, sorted nearest-first."""
    norm = _strip_accents(target_city)
    if norm == "lisbon":
        norm = "lisboa"
    origin = COORDS_CACHE.get(norm)
    if not origin:
        return []

    nearby: List[Tuple[float, str]] = []
    for city, coords in PT_CITIES_COORDS.items():
        if city == norm:
            continue
        dist = haversine_distance(origin[0], origin[1], coords[0], coords[1])
        if dist <= max_distance_km:
            nearby.append((dist, city))

    nearby.sort(key=lambda pair: pair[0])
    return [city for _, city in nearby]


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
    raw_norm = (city_name or "").strip().lower()
    norm = _strip_accents(city_name)
    if not norm:
        return None
    if raw_norm in COORDS_CACHE:
        return COORDS_CACHE[raw_norm]
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
