"""Video processing pipeline using ffmpeg."""
import subprocess
import os
import json
from pathlib import Path
from typing import List, Tuple, Optional


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
        "-preset", "ultrafast",
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


def _get_video_dimensions(filepath: str) -> Tuple[int, int]:
    """Return (width, height) of the first video stream, rounded down to even numbers."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json",
            filepath,
        ],
        capture_output=True,
        text=True,
        timeout=15,
    )
    data = json.loads(result.stdout)
    stream = data.get("streams", [{}])[0]
    w = int(stream.get("width", 1920))
    h = int(stream.get("height", 1080))
    return (w // 2) * 2, (h // 2) * 2


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
        import shutil
        shutil.copy2(video_paths[0], output_path)
        return

    # Probe the first clip to get the normalization target dimensions.
    # All clips are scaled to these dims before concat so the concat filter
    # receives identical stream parameters — different resolutions from Pexels
    # clips is what causes distorted frames with the old concat-demuxer approach.
    try:
        target_w, target_h = _get_video_dimensions(video_paths[0])
    except Exception:
        target_w, target_h = 1920, 1080

    n = len(video_paths)
    inputs = [item for p in video_paths for item in ("-i", p)]

    # Per-clip: scale-fill-crop to the target dims and normalize SAR.
    # Audio is intentionally dropped here — mix_audio replaces it anyway.
    scale_filters = [
        f"[{i}:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase,"
        f"crop={target_w}:{target_h},setsar=1,fps=30[v{i}]"
        for i in range(n)
    ]
    concat_in = "".join(f"[v{i}]" for i in range(n))
    filter_complex = ";".join(scale_filters) + f";{concat_in}concat=n={n}:v=1[vout]"

    cmd = [
        "ffmpeg",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-an",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-y",
        output_path,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg concat failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Video concatenation timeout")
    except Exception as e:
        raise VideoProcessingError(f"Concat failed: {str(e)}")


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
        "-preset", "ultrafast",
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


_FONT_NAME: dict[tuple[str, bool, bool], str] = {
    ("sans",  False, False): "DejaVu Sans",
    ("sans",  True,  False): "DejaVu Sans Bold",
    ("sans",  False, True):  "DejaVu Sans Oblique",
    ("sans",  True,  True):  "DejaVu Sans Bold Oblique",
    ("serif", False, False): "DejaVu Serif",
    ("serif", True,  False): "DejaVu Serif Bold",
    ("serif", False, True):  "DejaVu Serif Italic",
    ("serif", True,  True):  "DejaVu Serif Bold Italic",
    ("mono",  False, False): "DejaVu Sans Mono",
    ("mono",  True,  False): "DejaVu Sans Mono Bold",
    ("mono",  False, True):  "DejaVu Sans Mono Oblique",
    ("mono",  True,  True):  "DejaVu Sans Mono Bold Oblique",
}


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("'", "\\'").replace(":", "\\:")


def _srt_timestamp(t: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t % 1) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def transcribe_audio_to_srt(video_path: str, output_dir: str, model_size: str = "base") -> str:
    """
    Transcribe the audio track of a video using OpenAI Whisper and write a .srt subtitle file.

    Whisper is loaded lazily so it doesn't slow startup. The 'base' model (~150 MB)
    gives a good speed/accuracy balance for short reels.  Use 'small' for more accuracy
    or 'tiny' for a faster result on CPU.

    Args:
        video_path:  Path to the source video (any format ffmpeg can read).
        output_dir:  Directory where subtitles.srt will be written.
        model_size:  Whisper model variant: tiny | base | small | medium | large.

    Returns:
        Absolute path to the generated .srt file.
    """
    try:
        import whisper  # lazy import — not everyone has GPU/large RAM
    except ImportError:
        raise VideoProcessingError(
            "openai-whisper is not installed. Add 'openai-whisper' to requirements.txt."
        )

    os.makedirs(output_dir, exist_ok=True)

    try:
        model = whisper.load_model(model_size)
        result = model.transcribe(video_path, word_timestamps=False, verbose=False)
    except Exception as e:
        raise VideoProcessingError(f"Whisper transcription failed: {e}")

    segments = result.get("segments", [])
    srt_path = os.path.join(output_dir, "subtitles.srt")

    with open(srt_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, 1):
            start = _srt_timestamp(seg["start"])
            end   = _srt_timestamp(seg["end"])
            text  = seg["text"].strip()
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")

    return srt_path


def burn_subtitles(input_path: str, srt_path: str, output_path: str) -> None:
    """
    Burn a .srt subtitle file into a video using FFmpeg's subtitles filter.

    The subtitles are styled with a white font, black outline, and centered near
    the bottom — matching the Instagram Reels aesthetic.

    Args:
        input_path:  Source video file.
        srt_path:    Path to the .srt subtitle file produced by transcribe_audio_to_srt().
        output_path: Output video with subtitles baked in.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # FFmpeg's subtitles filter needs forward slashes and escaped colons on all platforms
    srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")

    subtitle_style = (
        "Fontname=DejaVu Sans,"
        "FontSize=22,"
        "PrimaryColour=&H00FFFFFF,"   # white text
        "OutlineColour=&H00000000,"   # black outline
        "Outline=2,"
        "Shadow=1,"
        "Alignment=2,"                # bottom-center
        "MarginV=60"                  # push up from the bottom edge a bit
    )

    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", f"subtitles='{srt_escaped}':force_style='{subtitle_style}'",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-c:a", "copy", "-y", output_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg subtitle burn failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Subtitle burning timeout")
    except VideoProcessingError:
        raise
    except Exception as e:
        raise VideoProcessingError(f"Burn subtitles failed: {e}")


def burn_text_overlays(input_path: str, output_path: str, overlays: list) -> None:
    """
    Burn one or more text overlays onto the video using chained FFmpeg drawtext filters.
    All overlays are applied in a single encode pass.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    filters = []
    for ov in overlays:
        text = _escape(ov.text.strip())
        if not text:
            continue
        x_expr = f"(w-text_w)*{ov.x / 100:.4f}"
        y_expr = f"(h-text_h)*{ov.y / 100:.4f}"
        font = _FONT_NAME.get((ov.font, ov.bold, ov.italic), "DejaVu Sans")
        filters.append(
            f"drawtext=text='{text}':fontsize=60:fontcolor=white"
            f":font='{font}':x={x_expr}:y={y_expr}:shadowx=2:shadowy=2:shadowcolor=black"
        )

    if not filters:
        import shutil
        shutil.copy2(input_path, output_path)
        return

    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", ",".join(filters),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
        "-c:a", "copy", "-y", output_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode != 0:
            raise VideoProcessingError(f"ffmpeg text overlay failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        raise VideoProcessingError("Text overlay timeout")
    except Exception as e:
        raise VideoProcessingError(f"Burn text failed: {str(e)}")
