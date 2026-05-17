'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { triggerDownload } from '@/lib/download';
import { Download, Package, ArrowLeft, CheckCircle } from 'lucide-react';

interface Props {
  exportDataUrls: string[];
  title: string;
  onBack: () => void;
}

export function CarouselExport({ exportDataUrls, title, onBack }: Props) {
  const [downloading, setDownloading] = useState(false);
  const safeTitle = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'carousel';

  const downloadSingle = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${safeTitle}_slide_${String(index + 1).padStart(2, '0')}.jpg`;
    link.click();
  };

  const downloadAll = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      exportDataUrls.forEach((url, i) => {
        const base64 = url.split(',')[1];
        zip.file(`${safeTitle}_slide_${String(i + 1).padStart(2, '0')}.jpg`, base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(window.URL.createObjectURL(blob), `${safeTitle}_slides.zip`, true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <CheckCircle size={22} className="text-emerald-400" />
            Ready to Export
          </h2>
          <p className="text-zinc-400 text-sm">
            {exportDataUrls.length} slides at 1080×1080px — download individually or as a ZIP.
          </p>
        </div>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Package size={16} />
          {downloading ? 'Zipping…' : 'Download All (ZIP)'}
        </button>
      </div>

      {/* Slide grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1 overflow-y-auto pb-4">
        {exportDataUrls.map((url, i) => (
          <div key={i} className="group relative">
            <div className="aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700">
              <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-zinc-400">Slide {i + 1}</span>
              <button
                onClick={() => downloadSingle(url, i)}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Download size={12} /> .jpg
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Back button */}
      <div className="pt-4 border-t border-zinc-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} /> Back to Editor
        </button>
      </div>
    </div>
  );
}
