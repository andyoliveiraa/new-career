from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseScraper(ABC):
    @property
    @abstractmethod
    def source_name(self) -> str:
        pass

    @abstractmethod
    async def search(self, query: str, location: Optional[str] = None, limit: int = 25) -> List[Dict[str, Any]]:
        """Search and return normalized job dictionaries."""
        pass
