'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Music,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { KeywordEngine } from '@/components/reels/KeywordEngine';
import { JobStatus, useReelGenerationContext } from '@/lib/ReelGenerationContext';
import { triggerDownload } from '@/lib/download';
import { ErrorBanner } from '@/components/ui/error-banner';

interface AudioFile {
  id: string;
  filename: string;
  duration: number;
}

function StatusLabel({ status }: { status: JobStatus['status'] }) {
  const labels: Record<JobStatus['status'], string> = {
    queued: 'Queued',
    processing: 'Processing',
    done: 'Complete',
    failed: 'Failed',
  };
  const colors: Record<JobStatus['status'], string> = {
    queued: 'text-gray-400',
    processing: 'text-blue-400',
    done: 'text-green-400',
    failed: 'text-red-400',
  };
  return <span className={`text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
}

function ProgressBar({ progress, status }: { progress: number; status: JobStatus['status'] }) {
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  const barColor = isFailed
    ? 'from-red-500 to-red-600'
    : isDone
      ? 'from-green-500 to-emerald-500'
      : 'from-blue-500 to-purple-500';
  const width = isDone || isFailed ? 100 : Math.max(progress, 4);

  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${barColor} relative overflow-hidden transition-all duration-700`}
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

function VideoPreview({ reelId, label }: { reelId: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {label && <p className="text-sm font-medium text-gray-300">{label}</p>}
      <div
        className="rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl"
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
  const [audioError, setAudioError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  // survives navigation
  const { jobs, isGenerating, error, startGeneration, reset } = useReelGenerationContext();

  const isActive = jobs.length > 0 || isGenerating;
  const allSettled = jobs.length > 0 && jobs.every((j) => j.status === 'done' || j.status === 'failed');
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
    setIsLoadingAudio(true);
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
      setIsLoadingAudio(false);
      e.target.value = '';
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
    await startGeneration(isBulk ? reelCount : 1, keywords, selectedAudioId, duration, reelTitle);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reels Generator</h1>
        <p className="text-gray-400">Enter keywords, pick audio, and generate Instagram-ready reels.</p>
      </div>

      {!isActive && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">1. Keywords</h2>
            <KeywordEngine keywords={keywords} onKeywordsChange={setKeywords} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">2. Audio Track</h2>

            {audioError && <ErrorBanner message={audioError} className="mb-3" />}

            {isLoadingAudio ? (
              <div className="flex items-center justify-center p-8 bg-white/5 rounded-lg border border-white/10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            ) : audioFiles.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {audioFiles.map((audio) => (
                  <label
                    key={audio.id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAudioId === audio.id
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audio"
                      value={audio.id}
                      checked={selectedAudioId === audio.id}
                      onChange={(e) => setSelectedAudioId(e.target.value)}
                      className="mr-3"
                    />
                    <Music className="w-4 h-4 mr-2 text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{audio.filename}</div>
                      <div className="text-xs text-gray-500">{audio.duration}s</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-white/5 rounded-lg border border-white/10">
                <p className="text-gray-400 mb-3">No audio files uploaded yet</p>
              </div>
            )}

            <div className="mt-3">
              <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer text-sm font-medium transition-colors">
                Upload Audio
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg"
                  onChange={handleAudioUpload}
                  className="hidden"
                  disabled={isLoadingAudio}
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">3. Settings</h2>
            <div className="space-y-4 bg-white/5 rounded-xl border border-white/10 p-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Reel Title</label>
                <input
                  type="text"
                  value={reelTitle}
                  onChange={(e) => setReelTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Duration: {duration}s</label>
                <input
                  type="range"
                  min="3"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">Bulk Creation</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Generate multiple reels, each with different footage
                  </p>
                </div>
                <button
                  onClick={() => setIsBulk(!isBulk)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                    isBulk ? 'bg-purple-600' : 'bg-gray-700'
                  }`}
                  aria-label="Toggle bulk creation"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      isBulk ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {isBulk && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Number of reels</label>
                  <div className="flex gap-2">
                    {[2, 3, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setReelCount(n)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                          reelCount === n
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/40 hover:text-purple-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(validationError || error) && (
            <ErrorBanner message={validationError || error!} />
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !keywords.length || !selectedAudioId}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30"
          >
            {isBulk ? (
              <>
                <Layers className="w-4 h-4" />
                Generate {reelCount} Reels
              </>
            ) : (
              'Generate Reel'
            )}
          </button>
        </div>
      )}

      {isActive && !allSettled && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-5 py-8">
            <Loader2
              className="w-14 h-14 animate-spin text-blue-400"
              style={{ animationDuration: '3s' }}
            />
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">
                {jobs.length > 1 ? `Generating ${jobs.length} reels…` : 'Generating reel…'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">Hang tight — this takes a minute</p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="p-5 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
              <span className="text-sm text-gray-400">Starting up…</span>
            </div>
          ) : (
            jobs.map((job, i) => (
              <div key={job.job_id} className="p-5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {job.status === 'done' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : job.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    )}
                    <span className="text-sm font-medium text-white">
                      {jobs.length > 1 ? `Reel ${i + 1} of ${jobs.length}` : 'Reel'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusLabel status={job.status} />
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {job.progress}%
                    </span>
                  </div>
                </div>
                <ProgressBar progress={job.progress} status={job.status} />
                {job.error_message && (
                  <p className="mt-2 text-xs text-red-400">{job.error_message}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {allSettled && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">
              {doneJobs.length} of {jobs.length} reel{jobs.length !== 1 ? 's' : ''} ready
            </h2>
          </div>

          {doneJobs.length > 0 && (
            <>
              {doneJobs.length === 1 ? (
                <div className="flex flex-col items-center gap-5">
                  <VideoPreview reelId={doneJobs[0].reel_id!} />
                  <button
                    onClick={() => handleDownload(doneJobs[0].reel_id!)}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Download Reel
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-center text-sm text-gray-400 mb-4">
                    {previewIndex + 1} / {doneJobs.length}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                      disabled={previewIndex === 0}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
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
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div className="flex justify-center gap-2 mt-5">
                    {doneJobs.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewIndex(i)}
                        className={`h-2 rounded-full transition-all duration-200 ${
                          i === previewIndex ? 'bg-blue-400 w-5' : 'bg-white/30 hover:bg-white/50 w-2'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex justify-center gap-3 mt-6">
                    <button
                      onClick={() => handleDownload(doneJobs[previewIndex].reel_id!, previewIndex)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download This
                    </button>
                    <button
                      onClick={handleDownloadAll}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors text-sm"
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
            className="w-full px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors"
          >
            Generate More
          </button>
        </div>
      )}
    </div>
  );
}
