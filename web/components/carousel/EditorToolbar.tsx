'use client';

import { Type, ImageIcon, Trash2, MoveUp, MoveDown, Bold, Italic, Palette, Image as ImageBg } from 'lucide-react';
import { PexelsPanel } from './PexelsPanel';
import { useState, useRef } from 'react';

const FONTS = ['Arial', 'Georgia', 'Courier New', 'Impact', 'Verdana', 'Trebuchet MS'];
const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];

export type SelectedInfo = {
  type: 'none' | 'text' | 'image' | 'shape';
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  bold?: boolean;
  italic?: boolean;
};

interface Props {
  selected: SelectedInfo;
  onAddText: () => void;
  onAddImage: (dataUrl: string) => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onSetFontFamily: (font: string) => void;
  onSetFontSize: (size: number) => void;
  onSetFill: (color: string) => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onSetBgColor: (color: string) => void;
  onSetBgPhoto: (url: string) => void;
}

export function EditorToolbar({
  selected,
  onAddText,
  onAddImage,
  onDelete,
  onBringForward,
  onSendBackward,
  onSetFontFamily,
  onSetFontSize,
  onSetFill,
  onToggleBold,
  onToggleItalic,
  onSetBgColor,
  onSetBgPhoto,
}: Props) {
  const [showPexels, setShowPexels] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) onAddImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="w-64 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Editor Tools</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Add objects */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">Add</p>
          <div className="flex gap-2">
            <button
              onClick={onAddText}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white transition-colors"
            >
              <Type size={14} /> Text
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white transition-colors"
            >
              <ImageIcon size={14} /> Image
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>

        {/* Text properties (only when text is selected) */}
        {selected.type === 'text' && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-2">Text</p>
            <div className="space-y-2">
              {/* Font family */}
              <select
                value={selected.fontFamily ?? 'Arial'}
                onChange={(e) => onSetFontFamily(e.target.value)}
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>

              {/* Font size */}
              <select
                value={selected.fontSize ?? 24}
                onChange={(e) => onSetFontSize(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
              </select>

              {/* Bold / Italic / Color */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleBold}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                    selected.bold ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <Bold size={14} />
                </button>
                <button
                  onClick={onToggleItalic}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    selected.italic ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <Italic size={14} />
                </button>
                <div className="flex items-center gap-1.5 flex-1">
                  <Palette size={13} className="text-zinc-400" />
                  <input
                    type="color"
                    value={selected.fill ?? '#ffffff'}
                    onChange={(e) => onSetFill(e.target.value)}
                    className="w-full h-7 rounded cursor-pointer bg-transparent border-0"
                    title="Text color"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Object actions (when anything is selected) */}
        {selected.type !== 'none' && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-2">Arrange</p>
            <div className="flex gap-2">
              <button
                onClick={onBringForward}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white"
                title="Bring forward"
              >
                <MoveUp size={13} /> Forward
              </button>
              <button
                onClick={onSendBackward}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white"
                title="Send backward"
              >
                <MoveDown size={13} /> Back
              </button>
            </div>
            <button
              onClick={onDelete}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/40 rounded-lg text-xs text-red-400 transition-colors"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}

        {/* Background */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">Background</p>
          <div className="flex items-center gap-2 mb-2">
            <ImageBg size={13} className="text-zinc-400" />
            <span className="text-xs text-zinc-300">Solid color</span>
            <input
              type="color"
              defaultValue="#1a1a2e"
              onChange={(e) => onSetBgColor(e.target.value)}
              className="ml-auto w-8 h-7 rounded cursor-pointer bg-transparent border-0"
            />
          </div>
          {showPexels ? (
            <div className="border border-zinc-700 rounded-xl p-3 h-72">
              <PexelsPanel onSelect={onSetBgPhoto} onClose={() => setShowPexels(false)} />
            </div>
          ) : (
            <button
              onClick={() => setShowPexels(true)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white flex items-center justify-center gap-1.5 transition-colors"
            >
              <ImageIcon size={13} /> Search Pexels Photos
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
