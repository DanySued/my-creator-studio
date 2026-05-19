"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Upload,
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AtSign,
  X,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Account } from "@/lib/types";
import { AccountAvatar } from "@/components/ui/account-avatar";

interface MediaItem {
  id: string;
  title: string;
  path: string;
  duration?: number;
  type: string;
  created_at: string;
}

interface ScheduledPost {
  id: string;
  account_username: string;
  post_type: string;
  caption: string;
  scheduled_at: string;
  status: string;
  error_message: string | null;
  posted_at: string | null;
}

const CAPTION_LIMIT = 2200;

function localDatetimeDefault() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PublishPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [queue, setQueue] = useState<ScheduledPost[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [caption, setCaption] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState(localDatetimeDefault());

  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoadingData(true);
    try {
      const [accRes, mediaRes, queueRes] = await Promise.all([
        fetch("/api/instagram/accounts"),
        fetch("/api/instagram/media"),
        fetch("/api/instagram/queue"),
      ]);
      if (accRes.ok) {
        const accs: Account[] = await accRes.json();
        setAccounts(accs.filter((a) => a.status === "connected"));
      }
      if (mediaRes.ok) setMediaList(await mediaRes.json());
      if (queueRes.ok) setQueue(await queueRes.json());
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedPath(null);
    setSelectedMedia(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/instagram/upload-media", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        const item: MediaItem = {
          id: data.id,
          title: file.name,
          path: data.path,
          type: file.type.startsWith("video") ? "reel" : "photo",
          created_at: new Date().toISOString(),
        };
        setMediaList((prev) => [item, ...prev]);
        setSelectedMedia(item);
        setUploadedPath(data.path);
      }
    } catch {
      // upload errors surface via the UI being unresponsive
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccountId || (!selectedMedia && !uploadedPath)) return;
    setSubmitting(true);
    setResult(null);

    const mediaPath = selectedMedia?.path ?? uploadedPath ?? "";
    const postType = selectedMedia?.type ?? "reel";

    try {
      if (mode === "now") {
        const res = await fetch("/api/instagram/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account_id: selectedAccountId, media_path: mediaPath, caption, post_type: postType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ?? "Post failed");
        setResult({ ok: true, message: "Posted successfully!", url: data.post_url });
      } else {
        const res = await fetch("/api/instagram/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: selectedAccountId,
            media_path: mediaPath,
            caption,
            post_type: postType,
            scheduled_at: new Date(scheduledAt).toISOString(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail ?? "Scheduling failed");
        setResult({ ok: true, message: "Scheduled successfully!" });
        setQueue((prev) => [data, ...prev]);
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPost = async (postId: string) => {
    await fetch(`/api/instagram/queue/${postId}`, { method: "DELETE" });
    setQueue((prev) => prev.map((p) => (p.id === postId ? { ...p, status: "cancelled" } : p)));
  };

  const canSubmit = selectedAccountId && (selectedMedia || uploadedPath) && !submitting;

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Publish</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Post or schedule content to Instagram from your generated media.
        </p>
      </div>

      {accounts.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-6">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-muted-foreground">
            No connected accounts found.{" "}
            <a href="/accounts" className="text-foreground font-medium underline underline-offset-2">
              Add an account
            </a>{" "}
            first.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Section title="Account">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connected accounts.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {accounts.map((acc) => (
                  <motion.button
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedAccountId === acc.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-secondary/50"
                    }`}
                  >
                    <AccountAvatar avatarUrl={acc.avatar_url} username={acc.username} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">@{acc.username}</p>
                      {acc.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{acc.full_name}</p>
                      )}
                    </div>
                    {selectedAccountId === acc.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </Section>

          <Section title="Media">
            <div
              className={`relative flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors cursor-pointer mb-3 group ${uploading ? "border-pulse border-primary/40" : "border-border hover:border-primary/40"}`}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Upload className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Upload a file</p>
                <p className="text-xs text-muted-foreground">MP4, MOV, JPG, PNG</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="video/*,image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
              />
            </div>

            {mediaList.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {mediaList.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => { setSelectedMedia(item); setUploadedPath(null); }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedMedia?.id === item.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type} · {fmtDatetime(item.created_at)}
                      </p>
                    </div>
                    {selectedMedia?.id === item.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {mediaList.length === 0 && !uploading && (
              <p className="text-sm text-muted-foreground">
                No generated reels yet.{" "}
                <a href="/reels" className="text-foreground underline underline-offset-2">Generate one</a>{" "}
                or upload a file above.
              </p>
            )}
          </Section>

          <Section title="Caption">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_LIMIT))}
              rows={4}
              placeholder="Write a caption… #hashtags work too"
              className="w-full px-3.5 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
            <p className={`text-xs mt-1 text-right tabular-nums transition-colors duration-300 ${caption.length > CAPTION_LIMIT - 100 ? "text-amber-400" : "text-muted-foreground"}`}>
              {caption.length} / {CAPTION_LIMIT}
            </p>
          </Section>

          <Section title="When to post">
            <div className="flex gap-2 mb-4">
              <ModeTab active={mode === "now"} onClick={() => setMode("now")} icon={<Send className="w-3.5 h-3.5" />} label="Post now" />
              <ModeTab active={mode === "schedule"} onClick={() => setMode("schedule")} icon={<Calendar className="w-3.5 h-3.5" />} label="Schedule" />
            </div>

            <AnimatePresence mode="wait">
              {mode === "schedule" && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date & time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Section>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                  result.ok
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : "bg-destructive/5 border-destructive/20 text-destructive"
                }`}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.1 }}
                  className="shrink-0 mt-0.5"
                >
                  {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </motion.span>
                <div className="flex-1">
                  <p className="font-medium">{result.message}</p>
                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs mt-1 underline underline-offset-2"
                    >
                      View on Instagram <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <button onClick={() => setResult(null)} className="shrink-0 hover:opacity-70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === "now" ? (
              <Send className="w-4 h-4" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            {submitting
              ? mode === "now" ? "Posting…" : "Scheduling…"
              : mode === "now" ? "Post Now" : "Schedule Post"}
          </motion.button>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Schedule Queue
          </h2>

          {queue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-xs text-muted-foreground">No scheduled posts yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              <AnimatePresence>
                {queue.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <QueueCard post={post} onCancel={() => handleCancelPost(post.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueCard({ post, onCancel }: { post: ScheduledPost; onCancel: () => void }) {
  const statusColors: Record<string, string> = {
    pending: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    posting: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    posted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    failed: "text-red-400 bg-red-500/10 border-red-500/20",
    cancelled: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${statusColors[post.status] ?? "text-muted-foreground"}`}>
            {post.status}
          </span>
          <span className="text-xs font-medium text-foreground">@{post.account_username}</span>
        </div>
        {post.status === "pending" && (
          <button
            onClick={onCancel}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Cancel"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {post.caption || <span className="italic">No caption</span>}
      </p>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Calendar className="w-3 h-3" />
        {post.status === "posted" && post.posted_at
          ? `Posted ${fmtDatetime(post.posted_at)}`
          : fmtDatetime(post.scheduled_at)}
      </div>
      {post.error_message && (
        <p className="text-[11px] text-red-400 mt-1.5 line-clamp-2">{post.error_message}</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-secondary text-muted-foreground border border-transparent hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
