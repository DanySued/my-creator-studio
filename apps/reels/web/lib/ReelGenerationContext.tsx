'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

export interface JobStatus {
  job_id: string;
  reel_id: string | null;
  status: 'queued' | 'processing' | 'awaiting_clip_approval' | 'done' | 'failed';
  progress: number;
  phase: 1 | 2;
  phase_progress: number;
  error_message: string | null;
  clip_count: number | null;
  created_at: string;
  completed_at: string | null;
  srt_path: string | null;
}

export interface TextOverlayItem {
  text: string;
  x: number;
  y: number;
  font: 'sans' | 'serif' | 'mono';
  bold: boolean;
  italic: boolean;
}

interface OverlayOptions {
  overlays?: TextOverlayItem[];
  subtitlesEnabled?: boolean;
}

interface ReelGenerationContextValue {
  jobs: JobStatus[];
  isGenerating: boolean;
  error: string | null;
  isDismissed: boolean;
  startGeneration: (
    count: number,
    keywords: string[],
    audioFileId: string,
    duration: number,
    title: string,
    songStartTime?: number,
    overlay?: OverlayOptions
  ) => Promise<void>;
  approveClips: (jobId: string) => Promise<void>;
  replaceClip: (jobId: string, index: number) => Promise<void>;
  reset: () => void;
  dismiss: () => void;
}

const ReelGenerationContext = createContext<ReelGenerationContextValue | null>(null);

const POLL_INTERVAL = 2000;

export function ReelGenerationProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const activePollers = useRef<Set<string>>(new Set());
  const pollerTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const startPolling = useCallback((jobId: string) => {
    activePollers.current.add(jobId);

    const poll = async () => {
      if (!activePollers.current.has(jobId)) return;
      try {
        const res = await fetch(`/api/reels/job/${jobId}`);
        if (!res.ok) throw new Error('Failed to fetch status');
        const data: JobStatus = await res.json();

        setJobs((prev) =>
          prev.map((j) => {
            if (j.job_id !== jobId) return j;
            if (
              j.status === data.status &&
              j.progress === data.progress &&
              j.reel_id === data.reel_id &&
              j.error_message === data.error_message
            ) return j;
            return data;
          })
        );

        if (data.status === 'queued' || data.status === 'processing') {
          const timer = setTimeout(poll, POLL_INTERVAL);
          pollerTimers.current.set(jobId, timer);
        } else {
          // Stop polling on terminal states (awaiting_clip_approval, done, failed)
          pollerTimers.current.delete(jobId);
          activePollers.current.delete(jobId);
          if (activePollers.current.size === 0) setIsGenerating(false);
        }
      } catch {
        pollerTimers.current.delete(jobId);
        activePollers.current.delete(jobId);
        if (activePollers.current.size === 0) setIsGenerating(false);
      }
    };

    poll();
  }, []);

  const startGeneration = useCallback(
    async (
      count: number,
      keywords: string[],
      audioFileId: string,
      duration: number,
      title: string,
      songStartTime: number = 0,
      overlay: OverlayOptions = {}
    ) => {
      setError(null);
      setIsGenerating(true);
      setIsDismissed(false);
      setJobs([]);
      pollerTimers.current.forEach((t) => clearTimeout(t));
      pollerTimers.current.clear();
      activePollers.current.clear();

      try {
        const requests = Array.from({ length: count }, (_, i) =>
          fetch('/api/reels/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keywords,
              audioFileId,
              duration,
              title: count > 1 ? `${title} ${i + 1}` : title,
              songStartTime,
              overlays: overlay.overlays ?? [],
              subtitlesEnabled: overlay.subtitlesEnabled ?? false,
            }),
          })
        );

        const responses = await Promise.all(requests);
        const newJobs: JobStatus[] = [];

        for (const res of responses) {
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || 'Generation failed');
          }
          newJobs.push(await res.json());
        }

        setJobs(newJobs);
        newJobs.forEach((job) => startPolling(job.job_id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
        setIsGenerating(false);
      }
    },
    [startPolling]
  );

  const approveClips = useCallback(
    async (jobId: string) => {
      const res = await fetch(`/api/reels/clips/${jobId}/approve`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to approve clips');
      }
      // Resume polling — status flips back to 'processing'
      setIsGenerating(true);
      startPolling(jobId);
    },
    [startPolling]
  );

  const replaceClip = useCallback(async (jobId: string, index: number) => {
    const res = await fetch(`/api/reels/clips/${jobId}/replace/${index}`, { method: 'POST' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || 'Failed to replace clip');
    }
  }, []);

  const reset = useCallback(() => {
    pollerTimers.current.forEach((t) => clearTimeout(t));
    pollerTimers.current.clear();
    activePollers.current.clear();
    setJobs([]);
    setIsGenerating(false);
    setError(null);
    setIsDismissed(false);
  }, []);

  const dismiss = useCallback(() => setIsDismissed(true), []);

  return (
    <ReelGenerationContext.Provider
      value={{ jobs, isGenerating, error, isDismissed, startGeneration, approveClips, replaceClip, reset, dismiss }}
    >
      {children}
    </ReelGenerationContext.Provider>
  );
}

export function useReelGenerationContext() {
  const ctx = useContext(ReelGenerationContext);
  if (!ctx) throw new Error('useReelGenerationContext must be used inside ReelGenerationProvider');
  return ctx;
}
