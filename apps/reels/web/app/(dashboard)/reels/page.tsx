'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Music,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle,
  Loader2,
  Upload,
  Trash2,
  Play,
  Square,
  Plus,
  X,
} from 'lucide-react';
import { KeywordEngine } from '@/components/reels/KeywordEngine';
import { JobStatus, TextOverlayItem, useReelGenerationContext } from '@/lib/ReelGenerationContext';
import { triggerDownload } from '@/lib/download';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AudioFile {
  id: string;
  filename: string;
  duration: number;
}

function StatusLabel({ status, phase, progress }: { status: JobStatus['status']; phase?: 1 | 2; progress?: number }) {
  let processingLabel = phase === 2 ? 'Rendering' : 'Preparing clips';
  if (phase === 2 && progress !== undefined && progress >= 96) processingLabel = 'Generating subtitles';
  const labels: Record<JobStatus['status'], string> = {
    queued: 'Queued',
    processing: processingLabel,
    awaiting_clip_approval: 'Review Clips',
    done: 'Complete',
    failed: 'Failed',
  };
  const colors: Record<JobStatus['status'], string> = {
    queued: 'text-muted-foreground',
    processing: 'text-blue-400',
    awaiting_clip_approval: 'text-amber-400',
    done: 'text-emerald-400',
    failed: 'text-destructive',
  };
  return <span className={`text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
}

function ProgressBar({ phaseProgress, status }: { phaseProgress: number; status: JobStatus['status'] }) {
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const [displayed, setDisplayed] = useState(phaseProgress);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const step = () => {
      setDisplayed((prev) => {
        const diff = phaseProgress - prev;
        if (Math.abs(diff) < 0.15) return phaseProgress;
        return prev + diff * 0.07;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [phaseProgress]);

  const barColor = isFailed
    ? 'from-red-500 to-red-600'
    : isDone
      ? 'from-emerald-500 to-green-500'
      : 'from-blue-500 to-purple-500';
  const width = isFailed ? 100 : isDone ? 100 : Math.max(displayed, 2);

  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${barColor} relative overflow-hidden`}
        style={{ width: `${width}%` }}
      >
        {!isDone && !isFailed && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ animation: 'progress-shimmer 1.3s ease-in-out infinite' }}
          />
        )}
      </div>
    </div>
  );
}

interface TextOverlay extends TextOverlayItem {
  id: string;
}

const PREVIEW_FONT: Record<string, React.CSSProperties> = {
  sans:  {},
  serif: { fontFamily: 'Georgia, serif' },
  mono:  { fontFamily: 'monospace' },
};

function TextOverlayPreview({
  overlays,
  selectedId,
  onSelect,
  onPositionChange,
}: {
  overlays: TextOverlay[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, pos: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  const clamp = (v: number) => Math.max(5, Math.min(95, v));

  const posFromClient = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-border select-none shrink-0"
      style={{
        width: '160px',
        aspectRatio: '9 / 16',
        background: 'linear-gradient(160deg, #27272a 0%, #18181b 50%, #09090b 100%)',
      }}
      onMouseMove={(e) => {
        if (dragging.current) onPositionChange(dragging.current, posFromClient(e.clientX, e.clientY));
      }}
      onMouseUp={() => { dragging.current = null; }}
      onMouseLeave={() => { dragging.current = null; }}
    >
      {/* scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)' }}
      />
      {/* play icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
          <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white/15 ml-1" />
        </div>
      </div>
      {/* drag hint */}
      <p className="absolute bottom-2 inset-x-0 text-center text-[8px] text-white/25 pointer-events-none">
        drag to reposition
      </p>

      {overlays.map((ov) => {
        const display = ov.text || (overlays.length === 1 ? 'Your text here' : '');
        if (!display) return null;
        const isSelected = ov.id === selectedId;
        return (
          <div
            key={ov.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
            style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
            onMouseDown={(e) => { e.preventDefault(); dragging.current = ov.id; onSelect(ov.id); }}
            onTouchStart={(e) => { e.preventDefault(); dragging.current = ov.id; onSelect(ov.id); }}
            onTouchMove={(e) => {
              if (dragging.current !== ov.id) return;
              const t = e.touches[0];
              onPositionChange(ov.id, posFromClient(t.clientX, t.clientY));
            }}
            onTouchEnd={() => { dragging.current = null; }}
          >
            <span
              className={cn(
                'block px-2 py-0.5 rounded text-[10px] shadow-lg max-w-[130px] truncate text-center text-white',
                ov.text ? 'bg-black/60' : 'bg-black/30 opacity-40',
                isSelected ? 'ring-1 ring-primary' : 'border border-white/15',
                ov.bold && 'font-bold',
                ov.italic && 'italic'
              )}
              style={PREVIEW_FONT[ov.font] ?? {}}
            >
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VideoPreview({ reelId, label }: { reelId: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}
      <div
        className="rounded-xl overflow-hidden bg-black border border-border shadow-2xl"
        style={{ width: '100%', maxWidth: '280px', aspectRatio: '9 / 16' }}
      >
        <video
          key={reelId}
          src={`/api/reels/download/${reelId}`}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        />
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [reelTitle, setReelTitle] = useState('Generated Reel');
  const [duration, setDuration] = useState(15);
  const [isBulk, setIsBulk] = useState(false);
  const [reelCount, setReelCount] = useState(3);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAudioId, setDeletingAudioId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [songStartTime, setSongStartTime] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewPlayStartRef = useRef<number>(0);

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);

  const [overlays, setOverlays] = useState<TextOverlay[]>([
    { id: '1', text: '', x: 50, y: 82, font: 'sans', bold: false, italic: false },
  ]);
  const [selectedOverlayId, setSelectedOverlayId] = useState('1');
  const [noText, setNoText] = useState(true);
  const nextOverlayId = useRef(2);

  const addOverlay = () => {
    const id = String(nextOverlayId.current++);
    setOverlays((prev) => [...prev, { id, text: '', x: 50, y: 50, font: 'sans', bold: false, italic: false }]);
    setSelectedOverlayId(id);
  };

  const removeOverlay = (id: string) => {
    setOverlays((prev) => {
      const next = prev.filter((o) => o.id !== id);
      if (selectedOverlayId === id) setSelectedOverlayId(next[0]?.id ?? '');
      return next;
    });
  };

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) ?? null;

  const [cleanupState, setCleanupState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'done'; freed_mb: number; dirs_cleaned: number }
  >({ status: 'idle' });

  const { jobs, isGenerating, error, startGeneration, approveClips, replaceClip, reset } = useReelGenerationContext();

  const isActive = jobs.length > 0 || isGenerating;
  const awaitingApprovalJobs = jobs.filter((j) => j.status === 'awaiting_clip_approval');
  const isAwaitingApproval = awaitingApprovalJobs.length > 0;

  // clip_versions: bump to force video src re-fetch after a Replace
  const [clipVersions, setClipVersions] = useState<Record<string, number>>({});
  const [replacingClips, setReplacingClips] = useState<Set<string>>(new Set());
  const [approvingJob, setApprovingJob] = useState<string | null>(null);
  const [clipError, setClipError] = useState<string | null>(null);

  const clipKey = (jobId: string, index: number) => `${jobId}-${index}`;

  const handleReplaceClip = async (jobId: string, index: number) => {
    const key = clipKey(jobId, index);
    setReplacingClips((prev) => new Set(prev).add(key));
    setClipError(null);
    try {
      await replaceClip(jobId, index);
      setClipVersions((prev) => ({ ...prev, [key]: Date.now() }));
    } catch (err) {
      setClipError(err instanceof Error ? err.message : 'Replace failed');
    } finally {
      setReplacingClips((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  };

  const handleApproveClips = async (jobId: string) => {
    setApprovingJob(jobId);
    setClipError(null);
    try {
      await approveClips(jobId);
    } catch (err) {
      setClipError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setApprovingJob(null);
    }
  };

  const selectedAudio = audioFiles.find((a) => a.id === selectedAudioId) ?? null;
  const maxStartTime = selectedAudio ? Math.max(0, selectedAudio.duration - duration) : 0;
  const effectiveSongStartTime = Math.min(songStartTime, maxStartTime);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stopPreview = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
    setIsPreviewPlaying(false);
    setIsPreviewLoading(false);
    setPreviewProgress(0);
  };

  const togglePreview = () => {
    if (isPreviewPlaying || isPreviewLoading) {
      stopPreview();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = effectiveSongStartTime;
    setIsPreviewLoading(true);
    audio.play();
    previewTimerRef.current = setTimeout(() => {
      audio.pause();
      setIsPreviewPlaying(false);
    }, duration * 1000);
  };

  useEffect(() => {
    if (!isPreviewPlaying) {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
      return;
    }
    previewPlayStartRef.current = Date.now();
    previewIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - previewPlayStartRef.current) / 1000;
      setPreviewProgress(Math.min(elapsed, duration));
    }, 80);
    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    };
  }, [isPreviewPlaying, duration]);

  const handleCleanup = async () => {
    setCleanupState({ status: 'loading' });
    try {
      const res = await fetch('/api/reels/cleanup-temp', { method: 'POST' });
      const data = await res.json();
      setCleanupState({ status: 'done', freed_mb: data.freed_mb ?? 0, dirs_cleaned: data.dirs_cleaned ?? 0 });
    } catch {
      setCleanupState({ status: 'idle' });
    }
  };
  const allSettled = jobs.length > 0 && jobs.every((j) => j.status === 'done' || j.status === 'failed');
  const currentPhase: 1 | 2 = jobs.some((j) => j.phase === 2) ? 2 : 1;
  const doneJobs = jobs.filter((j) => j.status === 'done' && j.reel_id);

  useEffect(() => {
    const loadAudio = async () => {
      setIsLoadingAudio(true);
      setAudioError(null);
      try {
        const res = await fetch('/api/reels/audio');
        if (!res.ok) throw new Error('Failed to load audio files');
        const data = await res.json();
        setAudioFiles(data.audio_files || []);
      } catch (err) {
        setAudioError(err instanceof Error ? err.message : 'Failed to load audio');
      } finally {
        setIsLoadingAudio(false);
      }
    };
    loadAudio();
  }, []);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setAudioError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/reels/upload-audio', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      const newAudio = await res.json();
      setAudioFiles((prev) => [newAudio, ...prev]);
      setSelectedAudioId(newAudio.id);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    setDeletingAudioId(audioId);
    setAudioError(null);
    try {
      const res = await fetch(`/api/reels/audio/${audioId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete audio');
      }
      setAudioFiles((prev) => prev.filter((a) => a.id !== audioId));
      if (selectedAudioId === audioId) setSelectedAudioId('');
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Failed to delete audio');
    } finally {
      setDeletingAudioId(null);
    }
  };

  const handleGenerate = async () => {
    if (keywords.length === 0) {
      setValidationError('Please add at least one keyword');
      return;
    }
    if (!selectedAudioId) {
      setValidationError('Please select or upload an audio track');
      return;
    }
    setValidationError(null);
    setPreviewIndex(0);
    const activeOverlays = noText
      ? []
      : overlays.map(({ text, x, y, font, bold, italic }) => ({ text, x, y, font, bold, italic }));
    await startGeneration(
      isBulk ? reelCount : 1,
      keywords,
      selectedAudioId,
      duration,
      reelTitle,
      effectiveSongStartTime,
      { overlays: activeOverlays, subtitlesEnabled }
    );
  };

  const handleDownload = (reelId: string, index?: number) => {
    const suffix = index !== undefined ? `-${index + 1}` : '';
    triggerDownload(
      `/api/reels/download/${reelId}`,
      `${reelTitle.replace(/\s+/g, '_')}${suffix}.mp4`
    );
  };

  const handleDownloadAll = () => {
    doneJobs.forEach((job, i) => setTimeout(() => handleDownload(job.reel_id!, i), i * 600));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {!isActive && (
        <div className="space-y-6">
          {/* Keywords */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">1. Keywords</h2>
            <KeywordEngine keywords={keywords} onKeywordsChange={setKeywords} />
          </motion.section>

          {/* Audio */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">2. Audio Track</h2>

            {audioError && <ErrorBanner message={audioError} className="mb-3" />}

            {isLoadingAudio ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[54px] w-full rounded-xl" />
                ))}
              </div>
            ) : audioFiles.length > 0 ? (
              <div className="space-y-2">
                {audioFiles.map((audio) => (
                  <label
                    key={audio.id}
                    className={cn(
                      'flex items-center p-3.5 rounded-xl border cursor-pointer transition-all',
                      selectedAudioId === audio.id
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-secondary/50 border-border hover:border-border/80 hover:bg-secondary'
                    )}
                  >
                    <input
                      type="radio"
                      name="audio"
                      value={audio.id}
                      checked={selectedAudioId === audio.id}
                      onChange={(e) => {
                        stopPreview();
                        setSongStartTime(0);
                        setSelectedAudioId(e.target.value);
                      }}
                      className="mr-3 accent-primary"
                    />
                    <Music className={cn('w-4 h-4 mr-2.5', selectedAudioId === audio.id ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{audio.filename}</div>
                      <div className="text-xs text-muted-foreground">{audio.duration}s</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleDeleteAudio(audio.id); }}
                      disabled={deletingAudioId === audio.id}
                      className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 shrink-0"
                      aria-label={`Delete ${audio.filename}`}
                    >
                      {deletingAudioId === audio.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-border bg-secondary/30 text-center">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <Music className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No audio tracks yet</p>
                <p className="text-xs text-muted-foreground mb-4">Upload an MP3, WAV, or M4A file to get started</p>
              </div>
            )}

            {selectedAudio && (
              <div className="mt-3 p-4 bg-secondary/50 rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Song start time</span>
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {formatTime(effectiveSongStartTime)} → {formatTime(Math.min(effectiveSongStartTime + duration, selectedAudio.duration))}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxStartTime}
                  value={effectiveSongStartTime}
                  onChange={(e) => {
                    stopPreview();
                    setSongStartTime(Number(e.target.value));
                  }}
                  disabled={maxStartTime === 0}
                  className="w-full accent-primary disabled:opacity-40"
                />
                {(isPreviewPlaying || isPreviewLoading) && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                      <span>{formatTime(effectiveSongStartTime + previewProgress)}</span>
                      <span>{formatTime(effectiveSongStartTime + duration)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(previewProgress / duration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Full track: {formatTime(selectedAudio.duration)}
                  </span>
                  <button
                    onClick={togglePreview}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                      isPreviewPlaying || isPreviewLoading
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isPreviewLoading
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                      : isPreviewPlaying
                        ? <><Square className="w-3 h-3" /> Stop</>
                        : <><Play className="w-3 h-3" /> Preview {duration}s</>
                    }
                  </button>
                </div>
                <audio
                  ref={audioRef}
                  src={`/api/reels/audio/${selectedAudio.id}`}
                  preload="metadata"
                  onPlaying={() => { setIsPreviewLoading(false); setIsPreviewPlaying(true); }}
                  onEnded={() => setIsPreviewPlaying(false)}
                />
              </div>
            )}

            <div className="mt-3">
              <label
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors',
                  isUploading
                    ? 'bg-secondary/60 border-border text-muted-foreground cursor-not-allowed opacity-70'
                    : 'bg-secondary hover:bg-secondary/80 border-border text-foreground cursor-pointer'
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload Audio
                  </>
                )}
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/x-m4a,audio/mp3,.mp3,.wav,.m4a,.ogg"
                  onChange={handleAudioUpload}
                  className="hidden"
                  disabled={isLoadingAudio || isUploading}
                />
              </label>
            </div>
          </motion.section>

          {/* Settings */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">3. Settings</h2>
            <div className="space-y-4 bg-secondary/50 rounded-xl border border-border p-5">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Duration: <span className="text-foreground font-semibold">{duration}s</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-medium text-foreground">Bulk Creation</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate multiple reels with different footage
                  </p>
                </div>
                <button
                  onClick={() => setIsBulk(!isBulk)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
                    isBulk ? 'bg-violet-500' : 'bg-secondary border border-border'
                  )}
                  aria-label="Toggle bulk creation"
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                      isBulk ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h10M7 16h6" />
                    </svg>
                    <span className="text-sm font-medium text-foreground">Auto Subtitles</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Transcribe audio with AI — burns captions into the video and exports a .srt file
                  </p>
                </div>
                <button
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0',
                    subtitlesEnabled ? 'bg-sky-500' : 'bg-secondary border border-border'
                  )}
                  aria-label="Toggle auto subtitles"
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                      subtitlesEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              {isBulk && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Number of reels</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setReelCount(n)}
                        className={cn(
                          'py-2 rounded-xl text-sm font-semibold border transition-all',
                          reelCount === n
                            ? 'bg-violet-500/15 border-violet-400/40 text-violet-400'
                            : 'bg-secondary border-border text-muted-foreground hover:border-violet-400/30 hover:text-violet-400'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Text Overlay */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.21, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">4. Text Overlay</h2>
              <button
                onClick={() => setNoText(!noText)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
                  !noText ? 'bg-primary' : 'bg-secondary border border-border'
                )}
                aria-label="Toggle text overlay"
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                    !noText ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {!noText ? (
              <div className="flex gap-4 items-start bg-secondary/50 rounded-xl border border-border p-4">
                {/* Overlay list */}
                <div className="flex-1 min-w-0 space-y-2">
                  {overlays.map((ov) => (
                    <div
                      key={ov.id}
                      onClick={() => setSelectedOverlayId(ov.id)}
                      className={cn(
                        'flex items-center gap-1.5 p-2 rounded-xl border cursor-pointer transition-all',
                        selectedOverlayId === ov.id
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-secondary hover:border-border/80'
                      )}
                    >
                      {/* Font selector */}
                      <select
                        value={ov.font}
                        onChange={(e) => updateOverlay(ov.id, { font: e.target.value as TextOverlay['font'] })}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-secondary border border-border rounded-lg px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 shrink-0"
                      >
                        <option value="sans">Sans</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Mono</option>
                      </select>

                      {/* Bold */}
                      <button
                        onClick={(e) => { e.stopPropagation(); updateOverlay(ov.id, { bold: !ov.bold }); }}
                        className={cn(
                          'w-6 h-6 rounded text-xs font-bold shrink-0 transition-colors',
                          ov.bold
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
                        )}
                      >B</button>

                      {/* Italic */}
                      <button
                        onClick={(e) => { e.stopPropagation(); updateOverlay(ov.id, { italic: !ov.italic }); }}
                        className={cn(
                          'w-6 h-6 rounded text-xs italic shrink-0 transition-colors',
                          ov.italic
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
                        )}
                      >I</button>

                      {/* Text input */}
                      <input
                        type="text"
                        value={ov.text}
                        onChange={(e) => updateOverlay(ov.id, { text: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Add text…"
                        className="flex-1 min-w-0 px-2 py-1 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                      />

                      {/* Remove */}
                      {overlays.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeOverlay(ov.id); }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addOverlay}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add text layer
                  </button>

                  {selectedOverlay && (
                    <p className="text-xs text-muted-foreground">
                      Position:{' '}
                      <span className="text-foreground tabular-nums">
                        {Math.round(selectedOverlay.x)}% left · {Math.round(selectedOverlay.y)}% top
                      </span>
                    </p>
                  )}
                </div>

                {/* Preview */}
                <TextOverlayPreview
                  overlays={overlays}
                  selectedId={selectedOverlayId}
                  onSelect={setSelectedOverlayId}
                  onPositionChange={(id, pos) => updateOverlay(id, pos)}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-xl border border-border px-4 py-3">
                No text will be added to the reel.
              </p>
            )}
          </motion.section>

          {(validationError || error) && (
            <ErrorBanner message={validationError || error!} />
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleCleanup}
              disabled={cleanupState.status === 'loading'}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
            >
              {cleanupState.status === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              {cleanupState.status === 'loading'
                ? 'Cleaning…'
                : cleanupState.status === 'done'
                  ? `Freed ${cleanupState.freed_mb} MB`
                  : 'Free Up Space'}
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={isGenerating || !keywords.length || !selectedAudioId}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            {isBulk ? (
              <>
                <Layers className="w-4 h-4" />
                Generate {reelCount} {reelCount === 1 ? 'Reel' : 'Reels'}
              </>
            ) : (
              'Generate Reel'
            )}
          </motion.button>
        </div>
      )}

      {isActive && !allSettled && !isAwaitingApproval && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border border-border bg-secondary hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          </div>
          <div className="flex flex-col items-center gap-5 py-12">
            <Loader2
              className="w-12 h-12 animate-spin text-primary"
              style={{ animationDuration: '3s' }}
            />
            <div className="text-center">
              <h2 className="text-base font-semibold text-foreground">
                {currentPhase === 2
                  ? jobs.length > 1 ? `Rendering ${jobs.length} reels…` : 'Rendering reel…'
                  : jobs.length > 1 ? `Preparing clips for ${jobs.length} reels…` : 'Preparing clips…'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {currentPhase === 2
                  ? 'Compositing, scaling, mixing audio…'
                  : 'Searching and trimming footage from Pexels'}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Phase {currentPhase} of 2
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="p-5 bg-secondary/50 rounded-xl border border-border flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">Starting up…</span>
            </div>
          ) : (
            jobs.map((job, i) => (
              <div key={job.job_id} className="p-5 bg-secondary/50 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {job.status === 'done' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : job.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {jobs.length > 1 ? `Reel ${i + 1} of ${jobs.length}` : 'Reel'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusLabel status={job.status} phase={job.phase} progress={job.progress} />
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {Math.round(job.phase_progress ?? job.progress)}%
                    </span>
                  </div>
                </div>
                <ProgressBar phaseProgress={job.phase_progress ?? job.progress} status={job.status} />
                {job.error_message && (
                  <p className="mt-2 text-xs text-destructive">{job.error_message}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {isActive && isAwaitingApproval && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-base font-semibold text-foreground">Review your clips</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Watch each clip — replace any you don&apos;t like, then approve to render the reel.
            </p>
          </div>

          {clipError && <ErrorBanner message={clipError} />}

          {awaitingApprovalJobs.map((job, jobIdx) => {
            const clipCount = job.clip_count ?? 0;
            return (
              <div key={job.job_id} className="space-y-4">
                {awaitingApprovalJobs.length > 1 && (
                  <p className="text-xs font-medium text-muted-foreground">
                    Reel {jobIdx + 1} of {awaitingApprovalJobs.length}
                  </p>
                )}

                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${Math.min(clipCount, 3)}, 1fr)` }}
                >
                  {Array.from({ length: clipCount }, (_, i) => {
                    const key = clipKey(job.job_id, i);
                    const version = clipVersions[key] ?? 0;
                    const isReplacing = replacingClips.has(key);
                    return (
                      <div
                        key={i}
                        className="flex flex-col gap-2 bg-secondary/50 rounded-xl border border-border p-2"
                      >
                        <div
                          className="relative rounded-lg overflow-hidden bg-black"
                          style={{ aspectRatio: '9 / 16' }}
                        >
                          {isReplacing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                          ) : (
                            <video
                              key={version}
                              src={`/api/reels/clips/${job.job_id}/${i}?v=${version}`}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                              muted
                            />
                          )}
                        </div>
                        <button
                          onClick={() => handleReplaceClip(job.job_id, i)}
                          disabled={isReplacing || approvingJob === job.job_id}
                          className="w-full py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          {isReplacing ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Finding…</>
                          ) : (
                            'Replace Clip'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleApproveClips(job.job_id)}
                  disabled={approvingJob === job.job_id || replacingClips.size > 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                >
                  {approvingJob === job.job_id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting render…</>
                  ) : (
                    'Approve & Generate Reel'
                  )}
                </button>
              </div>
            );
          })}

          {/* Show progress for any jobs still processing (bulk case) */}
          {jobs.filter((j) => j.status === 'processing' || j.status === 'queued').map((job) => (
            <div key={job.job_id} className="p-4 bg-secondary/50 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-xs font-medium text-foreground">Preparing clips…</span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(job.phase_progress ?? job.progress)}%
                </span>
              </div>
              <ProgressBar phaseProgress={job.phase_progress ?? job.progress} status={job.status} />
            </div>
          ))}
        </div>
      )}

      {allSettled && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-foreground">
              {doneJobs.length} of {jobs.length} reel{jobs.length !== 1 ? 's' : ''} ready
            </h2>
          </div>

          {doneJobs.length > 0 && (
            <>
              {doneJobs.length === 1 ? (
                <div className="flex flex-col items-center gap-5">
                  <VideoPreview reelId={doneJobs[0].reel_id!} />
                  <div className="flex items-center gap-3">
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      onClick={() => handleDownload(doneJobs[0].reel_id!)}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      Download Reel
                    </motion.button>
                    {doneJobs[0].srt_path && (
                      <button
                        onClick={() => triggerDownload(`/api/reels/download/${doneJobs[0].reel_id}/srt`, `${reelTitle.replace(/\s+/g, '_')}.srt`)}
                        className="px-4 py-3 bg-sky-700 hover:bg-sky-600 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
                        title="Download subtitle file (.srt)"
                      >
                        <Download className="w-4 h-4" />
                        .srt
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-center text-sm text-muted-foreground mb-4">
                    {previewIndex + 1} / {doneJobs.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                      disabled={previewIndex === 0}
                      className="p-2.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <div className="flex-1 flex justify-center">
                      <VideoPreview
                        reelId={doneJobs[previewIndex].reel_id!}
                        label={`Reel ${previewIndex + 1}`}
                      />
                    </div>
                    <button
                      onClick={() => setPreviewIndex((p) => Math.min(doneJobs.length - 1, p + 1))}
                      disabled={previewIndex === doneJobs.length - 1}
                      className="p-2.5 rounded-full bg-secondary hover:bg-secondary/80 border border-border disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0"
                    >
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                  </div>

                  <div className="flex justify-center gap-2 mt-5">
                    {doneJobs.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewIndex(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-200',
                          i === previewIndex ? 'bg-primary w-5' : 'bg-border hover:bg-muted-foreground w-1.5'
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex justify-center gap-3 mt-6 flex-wrap">
                    <button
                      onClick={() => handleDownload(doneJobs[previewIndex].reel_id!, previewIndex)}
                      className="px-5 py-2.5 bg-secondary border border-border hover:bg-secondary/80 text-foreground font-medium rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download This
                    </button>
                    {doneJobs[previewIndex].srt_path && (
                      <button
                        onClick={() => triggerDownload(`/api/reels/download/${doneJobs[previewIndex].reel_id}/srt`, `${reelTitle.replace(/\s+/g, '_')}_${previewIndex + 1}.srt`)}
                        className="px-4 py-2.5 bg-sky-700 hover:bg-sky-600 text-white font-medium rounded-xl flex items-center gap-2 transition-colors text-sm"
                        title="Download subtitle file (.srt)"
                      >
                        <Download className="w-4 h-4" />
                        .srt
                      </button>
                    )}
                    <button
                      onClick={handleDownloadAll}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download All ({doneJobs.length})
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {jobs.map((job, i) =>
            job.status === 'failed' ? (
              <ErrorBanner
                key={job.job_id}
                message={`${jobs.length > 1 ? `Reel ${i + 1} failed: ` : 'Failed: '}${job.error_message || 'Generation failed'}`}
              />
            ) : null
          )}

          <button
            onClick={reset}
            className="w-full px-6 py-3 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold rounded-xl transition-colors"
          >
            Generate More
          </button>
        </div>
      )}
    </div>
  );
}
