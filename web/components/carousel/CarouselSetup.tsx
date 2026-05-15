'use client';

import { useState } from 'react';
import { UploadZone } from './UploadZone';
import { extractText } from '@/lib/textExtraction';
import { Loader, FileText, X } from 'lucide-react';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal & structured' },
  { id: 'casual', label: 'Casual', desc: 'Friendly & relatable' },
  { id: 'inspirational', label: 'Inspirational', desc: 'Motivational & story-driven' },
  { id: 'educational', label: 'Educational', desc: 'Clear & step-by-step' },
  { id: 'bold', label: 'Bold', desc: 'Punchy & high-impact' },
] as const;

export type Tone = typeof TONES[number]['id'];

export interface SetupConfig {
  content: string;
  fileName: string;
  tone: Tone;
  slideCount: number;
  title: string;
}

interface Props {
  onGenerate: (config: SetupConfig) => void;
  isGenerating: boolean;
}

export function CarouselSetup({ onGenerate, isGenerating }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [slideCount, setSlideCount] = useState(6);
  const [title, setTitle] = useState('My Carousel');
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const handleFile = async (f: File) => {
    setError(null);
    setExtracting(true);
    try {
      const text = await extractText(f);
      if (text.length < 10) throw new Error('File contains too little text');
      setFile(f);
      setContent(text);
      if (!title || title === 'My Carousel') {
        setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract text');
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerate = () => {
    if (!content) { setError('Please upload a file first'); return; }
    onGenerate({ content, fileName: file?.name ?? '', tone, slideCount, title });
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Set Up Your Carousel</h2>
        <p className="text-zinc-400 text-sm">Upload your content, choose a tone, and set how many slides you want.</p>
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-y-auto pb-4">
        {/* File upload */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Content File</label>
          {file ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-zinc-600 rounded-xl">
              <FileText size={18} className="text-purple-400 flex-shrink-0" />
              <span className="text-sm text-white flex-1 truncate">{file.name}</span>
              <span className="text-xs text-zinc-400">{content.length.toLocaleString()} chars</span>
              <button onClick={() => { setFile(null); setContent(''); }} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="h-40">
              {extracting ? (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl">
                  <Loader size={20} className="animate-spin text-purple-400 mr-2" />
                  <span className="text-zinc-400 text-sm">Extracting text…</span>
                </div>
              ) : (
                <UploadZone onFileUpload={handleFile} />
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Carousel Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Carousel"
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">Tone</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`px-3 py-2.5 rounded-xl text-left border transition-all ${
                  tone === t.id
                    ? 'border-purple-400 bg-purple-500/10 text-white'
                    : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Slide count */}
        <div>
          <label className="block text-sm font-semibold text-zinc-300 mb-2">
            Number of Slides <span className="text-purple-400 font-bold ml-1">{slideCount}</span>
          </label>
          <input
            type="range"
            min={3}
            max={15}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-1">
            <span>3</span><span>15</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !content}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {isGenerating && <Loader size={16} className="animate-spin" />}
          {isGenerating ? 'Generating with Gemini…' : 'Generate Slides'}
        </button>
      </div>
    </div>
  );
}
