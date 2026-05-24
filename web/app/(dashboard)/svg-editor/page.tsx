'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Save, AlertTriangle, FileImage } from 'lucide-react';

export default function SvgEditorPage() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/svg-templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => showToast('Failed to load templates', false));
  }, []);

  const handleIframeLoad = useCallback(() => {
    // Poll until svgEditor.init() resolves and sets window.svgEditor
    const poll = () => {
      const win = iframeRef.current?.contentWindow as Record<string, unknown> | null;
      if (win?.svgEditor) {
        setEditorReady(true);
      } else {
        setTimeout(poll, 250);
      }
    };
    setTimeout(poll, 250);
  }, []);

  const loadTemplate = async (name: string) => {
    if (!iframeRef.current) return;
    setIsLoadingTemplate(true);
    setSelected(name);
    try {
      const res = await fetch(`/api/svg-templates/${name}`);
      if (!res.ok) throw new Error('Fetch failed');
      const svgContent = await res.text();
      const win = iframeRef.current.contentWindow as Record<string, unknown> & Window;
      // SVG-edit exposes svgEditor on the iframe's window after init
      const editor = win?.svgEditor as { loadSvgString?: (s: string) => void } | undefined;
      if (editor?.loadSvgString) {
        editor.loadSvgString(svgContent);
      } else {
        showToast('Editor not ready — try again in a moment', false);
      }
    } catch {
      showToast('Failed to load template', false);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSave = async () => {
    if (!selected || !iframeRef.current) return;
    setIsSaving(true);
    try {
      const win = iframeRef.current.contentWindow as Record<string, unknown> & Window;
      const editor = win?.svgEditor as {
        svgCanvas?: { getSvgString?: () => string };
        getSvgString?: () => string;
      } | undefined;
      const svgContent =
        editor?.svgCanvas?.getSvgString?.() ?? editor?.getSvgString?.();
      if (!svgContent) {
        showToast('Could not read SVG from editor', false);
        return;
      }
      const res = await fetch(`/api/svg-templates/${selected}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg_content: svgContent }),
      });
      showToast(res.ok ? 'Saved!' : 'Save failed', res.ok);
    } catch {
      showToast('Save failed', false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className="w-[180px] flex-shrink-0 flex flex-col border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-widest">Templates</h2>
        </div>
        <nav className="p-2 space-y-1">
          {templates.length === 0 ? (
            <p className="text-[11px] text-muted-foreground px-2 py-4 text-center">No templates found</p>
          ) : (
            templates.map((name) => (
              <button
                key={name}
                onClick={() => editorReady && loadTemplate(name)}
                disabled={!editorReady || isLoadingTemplate}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg transition-colors text-left ${
                  selected === name
                    ? 'bg-primary/20 text-primary ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                <FileImage className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{name}</span>
                {selected === name && isLoadingTemplate && (
                  <Loader2 className="w-3 h-3 animate-spin ml-auto shrink-0" />
                )}
              </button>
            ))
          )}
        </nav>

        {/* Notice about complex SVGs */}
        <div className="mt-auto p-3 border-t border-border">
          <div className="flex gap-1.5 text-[10px] text-muted-foreground/60 leading-relaxed">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Canva-exported SVGs may render with some visual differences in the editor.</span>
          </div>
        </div>
      </aside>

      {/* ─── Editor area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0 bg-background/80">
          <span className="text-xs text-muted-foreground">
            {selected ? (
              <>Editing: <span className="text-foreground font-medium">{selected}</span></>
            ) : (
              editorReady ? 'Select a template to start editing' : 'Loading editor…'
            )}
          </span>
          <div className="flex items-center gap-3">
            {toast && (
              <span className={`text-xs ${toast.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {toast.msg}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!selected || isSaving || !editorReady}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary-foreground bg-primary hover:brightness-110 disabled:bg-secondary disabled:text-muted-foreground rounded-lg transition-all font-medium"
            >
              {isSaving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-3 h-3" /> Save</>
              )}
            </button>
          </div>
        </div>

        {/* SVG-edit iframe — always mounted so editor only inits once */}
        <div className="flex-1 relative">
          {!editorReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Loading SVG-edit…</span>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="/svgedit/index.html"
            onLoad={handleIframeLoad}
            className="w-full h-full border-none"
            title="SVG Editor"
          />
        </div>
      </div>
    </div>
  );
}
