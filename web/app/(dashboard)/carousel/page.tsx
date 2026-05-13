'use client';

import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { UploadZone } from '@/components/carousel/UploadZone';
import { ConfigPanel } from '@/components/carousel/ConfigPanel';
import { SlidePreview } from '@/components/carousel/SlidePreview';
import { SlideStrip } from '@/components/carousel/SlideStrip';
import { extractText } from '@/lib/textExtraction';
import { triggerDownload } from '@/lib/download';
import { Loader } from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  content: string;
}

export default function CarouselPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [theme, setTheme] = useState('midnight');
  const [title, setTitle] = useState('Generated Carousel');
  const [directory, setDirectory] = useState('downloads');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slideRef = useRef<HTMLDivElement | null>(null);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setUploadedFile(file);

    try {
      const extractedText = await extractText(file);
      if (extractedText.length < 10) {
        throw new Error('File contains too little text');
      }
      setContent(extractedText);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to extract text';
      setError(`Extraction error: ${errorMsg}`);
      setUploadedFile(null);
    }
  };

  const handleGenerate = async () => {
    if (!content) {
      setError('No content to generate from');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          slideCount: 5,
          theme,
          title,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();
      const formattedSlides: Slide[] = data.slides.map(
        (slide: { title: string; content: string }, index: number) => ({
          id: index,
          title: slide.title,
          content: slide.content,
        })
      );

      setSlides(formattedSlides);
      setCurrentSlide(0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    if (slides.length === 0) {
      setError('No slides to export');
      return;
    }
    if (!slideRef.current) {
      setError('Slide preview not available');
      return;
    }

    setError(null);
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const savedSlide = currentSlide;

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        // Wait two frames: one for React state flush, one for paint
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        if (!slideRef.current) throw new Error('Lost reference to slide preview');

        const dataUrl = await toPng(slideRef.current, { pixelRatio: 2 });
        const base64 = dataUrl.split(',')[1];
        zip.file(`slide_${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
      }

      setCurrentSlide(savedSlide);

      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(window.URL.createObjectURL(blob), `${title.replace(/\s+/g, '_')}_slides.zip`, true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      setError(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Upload or Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {!uploadedFile ? (
            <div className="w-full max-w-3xl h-96">
              <UploadZone onFileUpload={handleFileUpload} />
            </div>
          ) : slides.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                ✓ File uploaded: <span className="text-white font-mono">{uploadedFile.name}</span>
              </p>
              <p className="text-sm text-gray-500">
                {content.length} characters extracted
              </p>
              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <SlidePreview
              currentSlide={currentSlide}
              totalSlides={slides.length}
              theme={theme}
              content={slides[currentSlide]?.content || ''}
              title={slides[currentSlide]?.title || ''}
              onPrevious={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              onNext={() =>
                setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))
              }
              containerRef={slideRef}
            />
          )}
        </div>

        {/* Slides Strip */}
        {slides.length > 0 && (
          <div className="px-8 pb-6">
            <SlideStrip
              slides={slides}
              currentSlide={currentSlide}
              onSlideSelect={setCurrentSlide}
              theme={theme}
            />
          </div>
        )}

        {/* Error Messages */}
        {error && slides.length === 0 && (
          <div className="px-8 pb-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-8 pb-6 flex gap-3">
          {!uploadedFile ? (
            <button
              onClick={() => setUploadedFile(null)}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              disabled
            >
              Clear
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setContent('');
                  setSlides([]);
                  setError(null);
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >
                Clear
              </button>
              {slides.length > 0 && (
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {isExporting && <Loader className="w-4 h-4 animate-spin" />}
                  {isExporting ? 'Exporting...' : 'Export as ZIP'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Config Panel */}
      <ConfigPanel
        content={content}
        onContentChange={setContent}
        theme={theme}
        onThemeChange={setTheme}
        title={title}
        onTitleChange={setTitle}
        directory={directory}
        onDirectoryChange={setDirectory}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}
