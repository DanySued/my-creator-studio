'use client';

import { useState } from 'react';
import { Search, Loader, X } from 'lucide-react';

interface Photo {
  id: number;
  thumb: string;
  full: string;
  photographer: string;
}

interface Props {
  onSelect: (fullUrl: string) => void;
  onClose: () => void;
}

export function PexelsPanel({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/carousel/pexels?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setPhotos(data.photos ?? []);
      if ((data.photos ?? []).length === 0) setError('No photos found. Try a different query.');
    } catch {
      setError('Failed to search Pexels.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">Pexels Backgrounds</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="nature, abstract, city…"
          className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-600 rounded-lg text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg"
        >
          {loading ? <Loader size={14} className="animate-spin text-white" /> : <Search size={14} className="text-white" />}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5 overflow-y-auto flex-1">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => { onSelect(p.full); onClose(); }}
            className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all group"
          >
            <img src={p.thumb} alt={p.photographer} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {photos.length === 0 && !loading && !error && (
        <p className="text-xs text-zinc-500 text-center mt-4">Search for a background image above.</p>
      )}
    </div>
  );
}
