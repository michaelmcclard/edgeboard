import httpx
import logging

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 10.0


async def safe_get(
    url: str,
    params: dict | None = None,
    headers: dict | None = None,
    fallback=None,
):
    """Make a resilient HTTP GET request. Returns fallback on any error."""
    try:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.warning(f"API call failed: {url} - {e}")
        return fallback
