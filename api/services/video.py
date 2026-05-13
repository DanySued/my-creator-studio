"""Video processing pipeline using ffmpeg."""
import subprocess
import os
import json
from pathlib import Path
from typing import List, Tuple


class VideoProcessingError(Exception):
    """Raised when video processing fails."""
    pass


def get_video_duration(filepath: str) -> float:
    """
    Get the duration of a video file in seconds using ffprobe.

    Args:
        filepath: Path to video file

    Returns:
        Duration in seconds
    """
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "json",
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            raise VideoProcessingError(f"ffprobe failed: {result.stderr}")

        data = json.loads(result.stdout)
        return float(data.get("format", {}).get("duration", 0))
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("ffprobe timeout")
    except Exception as e:
        raise VideoProcessingError(f"Failed to get video duration: {str(e)}")


def trim_video(
    input_path: str,
    output_path: str,
    start_time: float = 0,
    duration: float = 5,
) -> None:
    """
    Trim a video clip to specified duration.

    Args:
        input_path: Input video file
        output_path: Output trimmed video
        start_time: Start time in seconds
        duration: Duration in seconds
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cmd = [
        "ffmpeg",
        "-ss", str(start_time),  # fast seek: before -i avoids decoding from start
        "-i", input_path,
        "-t", str(duration),
        "-r", "30",       # lock to 30fps — consistent with viralvibe standard
        "-c:v", "libx264",
        "-crf", "23",
        "-c:a", "aac",
        "-y",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg trim failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Video trimming timeout")
    except Exception as e:
        raise VideoProcessingError(f"Trim failed: {str(e)}")


def concatenate_videos(
    video_paths: List[str],
    output_path: str,
) -> None:
    """
    Concatenate multiple video clips in sequence.

    Args:
        video_paths: List of input video file paths (in order)
        output_path: Output concatenated video
    """
    if len(video_paths) < 1:
        raise VideoProcessingError("No videos to concatenate")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if len(video_paths) == 1:
        # Single video, just copy
        subprocess.run(["cp", video_paths[0], output_path], check=True)
        return

    # Create concat demuxer file
    concat_file = output_path.replace(".mp4", "_concat.txt")
    with open(concat_file, "w") as f:
        for video in video_paths:
            f.write(f"file '{os.path.abspath(video)}'\n")

    cmd = [
        "ffmpeg",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-r", "30",
        "-c:v", "libx264",  # re-encode so keyframes align at cut points (no glitches)
        "-crf", "23",
        "-c:a", "aac",
        "-y",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg concat failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Video concatenation timeout")
    except Exception as e:
        raise VideoProcessingError(f"Concat failed: {str(e)}")
    finally:
        # Clean up concat file
        if os.path.exists(concat_file):
            os.remove(concat_file)


def scale_to_instagram_reels(
    input_path: str,
    output_path: str,
) -> None:
    """
    Scale video to Instagram Reels format (1080x1920, 9:16 aspect ratio).

    Args:
        input_path: Input video
        output_path: Output scaled video
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cmd = [
        "ffmpeg",
        "-i", input_path,
        # Scale up so the smaller dimension fills the frame, then crop to exact 1080x1920
        # This fills the frame instead of letterboxing with black bars
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-r", "30",
        "-c:v", "libx264",
        "-crf", "23",
        "-c:a", "aac",
        "-y",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg scale failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Video scaling timeout")
    except Exception as e:
        raise VideoProcessingError(f"Scale failed: {str(e)}")


def mix_audio(
    video_path: str,
    audio_path: str,
    output_path: str,
    audio_start_time: int = 0,
) -> None:
    """
    Mix audio with video (audio takes priority, loops if shorter).

    Args:
        video_path: Input video file (no audio or has audio)
        audio_path: Input audio file
        output_path: Output video with mixed audio
        audio_start_time: Start the audio track from this many seconds in (e.g. skip intro to hit the drop)
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-ss", str(audio_start_time),  # seek audio to the right part of the song before mixing
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",   # 192 kbps — matches viralvibe quality standard
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        "-y",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg audio mix failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Audio mixing timeout")
    except Exception as e:
        raise VideoProcessingError(f"Mix audio failed: {str(e)}")


def burn_text_overlay(
    input_path: str,
    output_path: str,
    text: str,
    x_pct: float = 50.0,  # 0=left edge, 50=center, 100=right edge
    y_pct: float = 82.0,  # 0=top edge, 82=near-bottom (viralvibe default), 100=bottom edge
) -> None:
    """
    Burn text overlay onto video at a percentage-based position.

    Args:
        input_path: Input video
        output_path: Output video with text
        text: Text to overlay
        x_pct: Horizontal position as % of frame width (centers the text block at that point)
        y_pct: Vertical position as % of frame height (centers the text block at that point)
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Escape special characters for ffmpeg drawtext
    text = text.replace("\\", "\\\\").replace("'", "\\'").replace(":", "\\:")

    # Convert percentages to ffmpeg expressions that center the text block at (x_pct%, y_pct%)
    x_expr = f"(w-text_w)*{x_pct / 100:.4f}"
    y_expr = f"(h-text_h)*{y_pct / 100:.4f}"

    cmd = [
        "ffmpeg",
        "-i", input_path,
        "-vf",
        f"drawtext=text='{text}':fontsize=60:fontcolor=white:x={x_expr}:y={y_expr}:shadowx=2:shadowy=2:shadowcolor=black",
        "-c:v", "libx264",
        "-crf", "23",
        "-c:a", "copy",
        "-y",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg text overlay failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Text overlay timeout")
    except Exception as e:
        raise VideoProcessingError(f"Burn text failed: {str(e)}")
