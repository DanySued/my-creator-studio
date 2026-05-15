"""Pexels API integration for fetching stock video clips."""
import asyncio
import httpx
import os
from typing import List


async def search_videos(keywords: List[str], per_page: int = 10) -> List[dict]:
    """
    Search Pexels for videos matching keywords.

    Args:
        keywords: List of search terms (e.g., ["nature", "sunset"])
        per_page: Number of results per query

    Returns:
        List of video metadata (includes video URLs and durations)
    """
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key:
        raise ValueError("PEXELS_API_KEY not set")

    base_url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": api_key}

    async with httpx.AsyncClient(timeout=30) as client:
        async def fetch_keyword(keyword: str) -> list:
            try:
                response = await client.get(
                    base_url,
                    headers=headers,
                    params={"query": keyword, "per_page": per_page, "orientation": "portrait"},
                )
                if response.status_code == 401:
                    raise ValueError("Pexels API key is invalid")
                if response.status_code == 429:
                    raise ValueError("Pexels rate limit exceeded")
                if not response.is_success:
                    raise ValueError(f"Pexels error: {response.text[:200]}")
                return response.json().get("videos", [])
            except httpx.TimeoutException:
                raise ValueError(f"Timeout searching for '{keyword}'")

        # Fire all keyword searches in parallel instead of one at a time
        results = await asyncio.gather(*[fetch_keyword(kw) for kw in keywords])
        videos = [v for batch in results for v in batch]

    if not videos:
        raise ValueError(f"No videos found for keywords: {keywords}")

    video_list = []
    for video in videos:
        video_files = video.get("video_files", [])
        if not video_files:
            continue

        # Prefer portrait (vertical) files so we don't need to crop landscape footage
        portrait_files = [f for f in video_files if f.get("height", 0) > f.get("width", 0)]
        candidate_pool = portrait_files if portrait_files else video_files

        # Prefer HD portrait (720–1920p) — same visual quality as 4K at a fraction of the
        # download size. A 4K portrait file is often 4–8× larger than 1080p for no benefit
        # after we scale/crop to 1080×1920 anyway.
        hd_files = [f for f in candidate_pool if 720 <= f.get("height", 0) <= 1920]
        target_pool = hd_files if hd_files else candidate_pool
        best_file = max(target_pool, key=lambda f: f.get("height", 0) * f.get("width", 0))

        video_list.append({
            "id": video.get("id"),
            "url": best_file.get("link"),
            "duration": video.get("duration"),
            "width": best_file.get("width"),
            "height": best_file.get("height"),
        })

    return video_list


async def download_video(url: str, filepath: str) -> None:
    """
    Download a video from Pexels URL to local file.

    Args:
        url: Video download URL
        filepath: Local path to save video
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            async with client.stream("GET", url) as response:
                if not response.is_success:
                    raise ValueError(f"Failed to download video: {response.status_code}")
                with open(filepath, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        f.write(chunk)
        except httpx.TimeoutException:
            raise ValueError("Video download timeout")
        except Exception as e:
            raise ValueError(f"Video download failed: {str(e)}")
