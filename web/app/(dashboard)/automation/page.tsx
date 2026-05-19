"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  MessageSquareReply,
  Users,
  Mail,
  Plus,
  Trash2,
  Play,
  Camera,
  Send,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserPlus,
  UserMinus,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Heart,
  UserCheck,
  UserX,
  MessageCircle,
  Activity,
  Clock,
} from "lucide-react";
import { Account } from "@/lib/types";

interface ReplyRule {
  id: string;
  trigger_keyword: string;
  reply_template: string;
  is_active: boolean;
  created_at: string;
}

interface DMRule {
  id: string;
  message_template: string;
  is_active: boolean;
  created_at: string;
}

interface FollowerDiff {
  snapshot_id: string;
  follower_count: number;
  previous_count: number | null;
  gained: { id: string; username?: string }[];
  lost: { id: string; username?: string }[];
  taken_at: string;
}

type Tab = "replies" | "followers" | "dms" | "growth" | "log";

interface DailyCounts {
  counts: { like: number; follow: number; unfollow: number; comment: number };
  limits: { like: number; follow: number; unfollow: number; comment: number };
  date: string;
}

interface ActivityEntry {
  id: string;
  action_type: string;
  message: string;
  created_at: string;
}

export default function AutomationPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [tab, setTab] = useState<Tab>("replies");
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => {
        const connected = data.filter((a) => a.status === "connected");
        setAccounts(connected);
        if (connected.length > 0) setSelectedAccount(connected[0]);
      })
      .finally(() => setLoadingAccounts(false));
  }, []);

  const TABS = [
    { id: "replies" as Tab, label: "Comment Replies", icon: MessageSquareReply },
    { id: "followers" as Tab, label: "Follower Tracker", icon: Users },
    { id: "dms" as Tab, label: "Welcome DMs", icon: Mail },
    { id: "growth" as Tab, label: "Growth Actions", icon: TrendingUp },
    { id: "log" as Tab, label: "Activity Log", icon: Activity },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Auto-reply to comments, track followers, send welcome DMs.
            </p>
          </div>
        </div>

        {!loadingAccounts && (
          accounts.length > 0 ? (
            <AccountSelector
              accounts={accounts}
              selected={selectedAccount}
              onSelect={setSelectedAccount}
            />
          ) : (
            <a
              href="/accounts"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Connect Instagram Account
            </a>
          )
        )}
      </div>

      {loadingAccounts && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loadingAccounts && (
        <>
          {accounts.length === 0 && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-sm text-amber-400 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Connect an Instagram account on the{" "}
              <a href="/accounts" className="font-semibold underline underline-offset-2 hover:text-amber-300">
                Accounts page
              </a>{" "}
              to run these features.
            </div>
          )}

          <div className="flex gap-1 mb-6 bg-secondary/50 rounded-xl p-1 w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === id && (
                  <motion.span
                    layoutId="automation-tab-pill"
                    className="absolute inset-0 rounded-lg bg-card shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 w-4 h-4" />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "replies" && (
              <TabPanel key="replies">
                <CommentRepliesTab accountId={selectedAccount?.id ?? ""} />
              </TabPanel>
            )}
            {tab === "followers" && (
              <TabPanel key="followers">
                <FollowerTrackerTab accountId={selectedAccount?.id ?? ""} />
              </TabPanel>
            )}
            {tab === "dms" && (
              <TabPanel key="dms">
                <WelcomeDMsTab accountId={selectedAccount?.id ?? ""} />
              </TabPanel>
            )}
            {tab === "growth" && (
              <TabPanel key="growth">
                <GrowthActionsTab accountId={selectedAccount?.id ?? ""} />
              </TabPanel>
            )}
            {tab === "log" && (
              <TabPanel key="log">
                <ActivityLogTab accountId={selectedAccount?.id ?? ""} />
              </TabPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function AccountSelector({
  accounts,
  selected,
  onSelect,
}: {
  accounts: Account[];
  selected: Account | null;
  onSelect: (a: Account) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
      >
        <span className="text-muted-foreground">@</span>
        <span>{selected?.username ?? "Select account"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-1.5 w-48 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden"
          >
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => { onSelect(a); setOpen(false); }}
                className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-secondary transition-colors ${
                  selected?.id === a.id ? "text-primary font-medium" : "text-foreground"
                }`}
              >
                @{a.username}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CommentRepliesTab({ accountId }: { accountId: string }) {
  const [rules, setRules] = useState<ReplyRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [template, setTemplate] = useState("");
  const [adding, setAdding] = useState(false);

  const [mediaId, setMediaId] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [useAI, setUseAI] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<null | { replied: number; skipped_already_replied: number; errors: number }>(null);

  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRules = useCallback(async () => {
    if (!accountId) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/automation/autoreply/rules/${accountId}`);
      if (r.ok) setRules(await r.json());
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = async () => {
    if (!template.trim()) return;
    setAdding(true);
    try {
      const r = await fetch("/api/automation/autoreply/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          trigger_keyword: keyword.trim() || "*",
          reply_template: template.trim(),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      setKeyword(""); setTemplate("");
      fetchRules();
      showToast("ok", "Rule added.");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/automation/autoreply/rules/${id}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleRule = async (rule: ReplyRule) => {
    await fetch(`/api/automation/autoreply/rules/${rule.id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  const runReplies = async () => {
    if (!mediaId.trim()) return;
    setRunning(true);
    setRunResult(null);
    try {
      const r = await fetch("/api/automation/autoreply/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          media_id: mediaId.trim(),
          use_ai: useAI,
          post_caption: postCaption,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      setRunResult(data);
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <InfoBanner
        icon={<Sparkles className="w-4 h-4 text-violet-400" />}
        text="Template rules fire first — if none match a comment, Gemini AI crafts a warm contextual reply."
      />

      <Section title="Reply Rules" subtitle="Keyword triggers with reply templates. Use * to match any comment.">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : rules.length === 0 ? (
          <EmptyMessage text="No rules yet. Add one below." />
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                      {rule.trigger_keyword === "*" ? "any comment" : `"${rule.trigger_keyword}"`}
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                  </div>
                  <p className="text-sm text-foreground truncate">{rule.reply_template}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleRule(rule)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title={rule.is_active ? "Disable rule" : "Enable rule"}
                  >
                    {rule.is_active
                      ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Rule</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Keyword trigger</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="price  (leave blank for any)"
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reply template</label>
              <input
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Check the link in bio! | DM us for pricing"
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tip: separate multiple reply variants with <code className="font-mono">|</code> — one is picked at random each time.
          </p>
          <button
            onClick={addRule}
            disabled={adding || !template.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Rule
          </button>
        </div>
      </Section>

      <Section title="Run on a Post" subtitle="Enter a post ID to scan all comments and auto-reply now.">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Post / Media ID</label>
              <input
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                placeholder="3654321098765432100"
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Post caption (optional, helps AI)</label>
              <input
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder="New reel just dropped…"
                className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <div
              onClick={() => setUseAI((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${useAI ? "bg-violet-500" : "bg-secondary border border-border"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${useAI ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-foreground">Use Gemini AI for unmatched comments</span>
          </label>

          <button
            onClick={runReplies}
            disabled={running || !mediaId.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Running…" : "Run Auto-Reply"}
          </button>

          {runResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
            >
              <p className="text-sm font-semibold text-emerald-400 mb-1">Done!</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{runResult.replied}</strong> replied</span>
                <span><strong className="text-foreground">{runResult.skipped_already_replied}</strong> already handled</span>
                {runResult.errors > 0 && (
                  <span className="text-destructive"><strong>{runResult.errors}</strong> errors</span>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </Section>

      <Toast toast={toast} />
    </div>
  );
}

function FollowerTrackerTab({ accountId }: { accountId: string }) {
  const [snapshot, setSnapshot] = useState<FollowerDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapping, setSnapping] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSnapshot = useCallback(async () => {
    if (!accountId) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/automation/followers/snapshot/${accountId}`);
      if (r.ok) {
        const data = await r.json();
        if (data.snapshot_id) setSnapshot(data);
      }
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchSnapshot(); }, [fetchSnapshot]);

  const takeSnapshot = async () => {
    setSnapping(true);
    try {
      const r = await fetch(`/api/automation/followers/snapshot/${accountId}`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      setSnapshot(data);
      showToast("ok", "Snapshot taken!");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSnapping(false);
    }
  };

  const delta =
    snapshot && snapshot.previous_count !== null
      ? snapshot.follower_count - snapshot.previous_count
      : null;

  return (
    <div className="space-y-6">
      <InfoBanner
        icon={<Camera className="w-4 h-4 text-violet-400" />}
        text="Take a snapshot to record your follower list. Compare two snapshots to see who followed and unfollowed you."
      />

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Followers"
            value={snapshot ? snapshot.follower_count.toLocaleString() : "—"}
            sub={snapshot ? `Snapshot: ${new Date(snapshot.taken_at).toLocaleString()}` : "No snapshot yet"}
          />
          <StatCard
            label="New Followers"
            value={snapshot ? `+${snapshot.gained.length}` : "—"}
            valueColor="text-emerald-400"
            sub="since last snapshot"
          />
          <StatCard
            label="Lost Followers"
            value={snapshot ? `-${snapshot.lost.length}` : "—"}
            valueColor="text-rose-400"
            sub="since last snapshot"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={takeSnapshot}
          disabled={snapping}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {snapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {snapping ? "Taking snapshot…" : "Take Snapshot Now"}
        </button>
        <p className="text-xs text-muted-foreground">
          Fetches your current follower list and compares it to the previous snapshot.
        </p>
      </div>

      {snapshot && (snapshot.gained.length > 0 || snapshot.lost.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <Section
            title={`New Followers (${snapshot.gained.length})`}
            subtitle="People who followed you since the last snapshot"
          >
            {snapshot.gained.length === 0 ? (
              <EmptyMessage text="No new followers." />
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {snapshot.gained.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-sm text-foreground">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{u.username ? `@${u.username}` : `ID ${u.id}`}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title={`Lost Followers (${snapshot.lost.length})`}
            subtitle="People who unfollowed you since the last snapshot"
          >
            {snapshot.lost.length === 0 ? (
              <EmptyMessage text="No lost followers." />
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {snapshot.lost.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 text-sm text-foreground">
                    <UserMinus className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate text-muted-foreground">{u.username ? `@${u.username}` : `ID ${u.id}`}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {snapshot && snapshot.gained.length === 0 && snapshot.lost.length === 0 && snapshot.previous_count !== null && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-secondary/50 text-sm text-muted-foreground border border-border">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          No changes since the last snapshot.
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}

function WelcomeDMsTab({ accountId }: { accountId: string }) {
  const [rules, setRules] = useState<DMRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState("");
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<null | { sent: number; errors: number; new_followers_found: number }>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRules = useCallback(async () => {
    if (!accountId) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/automation/dm/rules/${accountId}`);
      if (r.ok) setRules(await r.json());
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const addRule = async () => {
    if (!template.trim()) return;
    setAdding(true);
    try {
      const r = await fetch("/api/automation/dm/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId, message_template: template.trim() }),
      });
      if (!r.ok) throw new Error((await r.json()).detail);
      setTemplate("");
      fetchRules();
      showToast("ok", "Template saved.");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/automation/dm/rules/${id}`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleRule = async (rule: DMRule) => {
    await fetch(`/api/automation/dm/rules/${rule.id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  const sendToNew = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const r = await fetch(`/api/automation/dm/send-to-new-followers/${accountId}`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      setSendResult(data);
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  const activeRule = rules.find((r) => r.is_active);

  return (
    <div className="space-y-6">
      <InfoBanner
        icon={<Mail className="w-4 h-4 text-violet-400" />}
        text="Automatically send a welcome DM to new followers detected between two snapshots. Use {username} as a placeholder."
      />

      <Section title="DM Templates" subtitle="Only the active template will be used when sending.">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : rules.length === 0 ? (
          <EmptyMessage text="No templates yet. Add one below." />
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border bg-card ${
                  rule.is_active ? "border-violet-500/30 bg-violet-500/5" : "border-border"
                }`}
              >
                <div className="flex-1 min-w-0">
                  {rule.is_active && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-1.5 inline-block">
                      Active
                    </span>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{rule.message_template}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleRule(rule)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title={rule.is_active ? "Deactivate" : "Activate"}
                  >
                    {rule.is_active
                      ? <ToggleRight className="w-4 h-4 text-violet-400" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Template</p>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder={"Hey {username}! 👋 Thanks for the follow — so glad you're here. Check the link in bio for exclusive content!"}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Use <code className="font-mono">{"{username}"}</code> to personalise the message with the follower's handle.
          </p>
          <button
            onClick={addRule}
            disabled={adding || !template.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Save Template
          </button>
        </div>
      </Section>

      <Section title="Send to New Followers" subtitle="DMs the active template to anyone who followed you since the last snapshot.">
        {!activeRule && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs mb-3">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>No active template. Enable one above first.</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={sendToNew}
            disabled={sending || !activeRule}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending…" : "Send Welcome DMs"}
          </button>
          <p className="text-xs text-muted-foreground">
            Requires at least 2 follower snapshots to detect new followers.
          </p>
        </div>

        {sendResult && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
          >
            <p className="text-sm font-semibold text-emerald-400 mb-1">Done!</p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{sendResult.new_followers_found}</strong> new followers detected</span>
              <span><strong className="text-foreground">{sendResult.sent}</strong> DMs sent</span>
              {sendResult.errors > 0 && (
                <span className="text-destructive"><strong>{sendResult.errors}</strong> errors</span>
              )}
            </div>
          </motion.div>
        )}
      </Section>

      <Toast toast={toast} />
    </div>
  );
}

function GrowthActionsTab({ accountId }: { accountId: string }) {
  const [counts, setCounts] = useState<DailyCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [likeHashtag, setLikeHashtag] = useState("");
  const [likeAmount, setLikeAmount] = useState(20);
  const [followHashtag, setFollowHashtag] = useState("");
  const [followAmount, setFollowAmount] = useState(10);
  const [unfollowAmount, setUnfollowAmount] = useState(20);
  const [commentHashtag, setCommentHashtag] = useState("");
  const [commentTexts, setCommentTexts] = useState("Great content! 🔥|Love this! ❤️|Amazing post! 👏");
  const [commentAmount, setCommentAmount] = useState(5);
  const [dmMediaId, setDmMediaId] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [dmAmount, setDmAmount] = useState(20);

  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCounts = useCallback(async () => {
    if (!accountId) { setLoadingCounts(false); return; }
    try {
      const r = await fetch(`/api/automation/growth/counts/${accountId}`);
      if (r.ok) setCounts(await r.json());
    } finally {
      setLoadingCounts(false);
    }
  }, [accountId]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const run = async (
    action: string,
    endpoint: string,
    body: object,
  ) => {
    setRunning(action);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail);
      setResults((prev) => ({ ...prev, [action]: data }));
      fetchCounts();
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRunning(null);
    }
  };

  const pct = (done: number, limit: number) => Math.min(100, Math.round((done / limit) * 100));

  return (
    <div className="space-y-6">
      <InfoBanner
        icon={<TrendingUp className="w-4 h-4 text-violet-400" />}
        text="All actions respect safe daily limits to protect your account. Limits reset at midnight UTC."
      />

      {!loadingCounts && counts && (
        <Section title="Today's Usage">
          <div className="grid grid-cols-2 gap-3">
            {(["like", "follow", "unfollow", "comment"] as const).map((at) => (
              <div key={at} className="p-3.5 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium capitalize text-foreground">{at}s</span>
                  <span className="text-xs text-muted-foreground">
                    {counts.counts[at]} / {counts.limits[at]}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      pct(counts.counts[at], counts.limits[at]) > 80
                        ? "bg-rose-500"
                        : "bg-violet-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct(counts.counts[at], counts.limits[at])}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Auto-Like by Hashtag" subtitle="Like recent posts from any hashtag to boost engagement signals.">
        <ActionCard
          icon={<Heart className="w-4 h-4 text-rose-400" />}
          result={results["like"]}
          resultLabel={(r) => `Liked ${r.liked} posts`}
        >
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hashtag</label>
              <input value={likeHashtag} onChange={(e) => setLikeHashtag(e.target.value)}
                placeholder="travel" className={inputCls} />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
              <input type="number" min={1} max={50} value={likeAmount}
                onChange={(e) => setLikeAmount(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <RunButton
            label="Run Auto-Like"
            loading={running === "like"}
            disabled={!likeHashtag.trim()}
            onClick={() => run("like", "/api/automation/growth/like", {
              account_id: accountId, hashtag: likeHashtag, amount: likeAmount,
            })}
          />
        </ActionCard>
      </Section>

      <Section title="Auto-Follow by Hashtag" subtitle="Follow users who posted under a hashtag — targets people interested in your niche.">
        <ActionCard
          icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          result={results["follow"]}
          resultLabel={(r) => `Followed ${r.followed} users`}
        >
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hashtag</label>
              <input value={followHashtag} onChange={(e) => setFollowHashtag(e.target.value)}
                placeholder="fitness" className={inputCls} />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
              <input type="number" min={1} max={30} value={followAmount}
                onChange={(e) => setFollowAmount(Number(e.target.value))} className={inputCls} />
            </div>
          </div>
          <RunButton
            label="Run Auto-Follow"
            loading={running === "follow"}
            disabled={!followHashtag.trim()}
            onClick={() => run("follow", "/api/automation/growth/follow", {
              account_id: accountId, hashtag: followHashtag, amount: followAmount,
            })}
          />
        </ActionCard>
      </Section>

      <Section title="Auto-Unfollow Non-Followers" subtitle="Clean up your following list by removing accounts that don't follow you back.">
        <ActionCard
          icon={<UserX className="w-4 h-4 text-amber-400" />}
          result={results["unfollow"]}
          resultLabel={(r) => `Unfollowed ${r.unfollowed} non-followers`}
        >
          <div className="w-32">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
            <input type="number" min={1} max={60} value={unfollowAmount}
              onChange={(e) => setUnfollowAmount(Number(e.target.value))} className={inputCls} />
          </div>
          <RunButton
            label="Run Auto-Unfollow"
            loading={running === "unfollow"}
            disabled={false}
            onClick={() => run("unfollow", "/api/automation/growth/unfollow", {
              account_id: accountId, amount: unfollowAmount,
            })}
          />
        </ActionCard>
      </Section>

      <Section title="Auto-Comment by Hashtag" subtitle="Leave comments on recent posts — use | to separate comment variants (one is picked at random).">
        <ActionCard
          icon={<MessageCircle className="w-4 h-4 text-blue-400" />}
          result={results["comment"]}
          resultLabel={(r) => `Commented on ${r.commented} posts`}
        >
          <div className="space-y-2">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-32">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hashtag</label>
                <input value={commentHashtag} onChange={(e) => setCommentHashtag(e.target.value)}
                  placeholder="photography" className={inputCls} />
              </div>
              <div className="w-24">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
                <input type="number" min={1} max={10} value={commentAmount}
                  onChange={(e) => setCommentAmount(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Comment variants (| separated)</label>
              <input value={commentTexts} onChange={(e) => setCommentTexts(e.target.value)}
                placeholder="Great shot! 📸|Love this! ❤️|Stunning! 🔥" className={inputCls} />
            </div>
          </div>
          <RunButton
            label="Run Auto-Comment"
            loading={running === "comment"}
            disabled={!commentHashtag.trim() || !commentTexts.trim()}
            onClick={() => run("comment", "/api/automation/growth/comment", {
              account_id: accountId,
              hashtag: commentHashtag,
              comments: commentTexts.split("|").map((s) => s.trim()).filter(Boolean),
              amount: commentAmount,
            })}
          />
        </ActionCard>
      </Section>

      <Section title="DM Post Commenters" subtitle="Send a direct message to everyone who commented on a specific post.">
        <ActionCard
          icon={<Send className="w-4 h-4 text-violet-400" />}
          result={results["dm_commenters"]}
          resultLabel={(r) => `DM'd ${r.sent} of ${r.unique_commenters} commenters`}
        >
          <div className="space-y-2">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Post / Media ID</label>
                <input value={dmMediaId} onChange={(e) => setDmMediaId(e.target.value)}
                  placeholder="3654321098765432100" className={inputCls} />
              </div>
              <div className="w-24">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max DMs</label>
                <input type="number" min={1} max={50} value={dmAmount}
                  onChange={(e) => setDmAmount(Number(e.target.value))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
              <input value={dmMessage} onChange={(e) => setDmMessage(e.target.value)}
                placeholder="Thanks for commenting! Check the link in bio 🔗" className={inputCls} />
            </div>
          </div>
          <RunButton
            label="Send DMs to Commenters"
            loading={running === "dm_commenters"}
            disabled={!dmMediaId.trim() || !dmMessage.trim()}
            onClick={() => run("dm_commenters", "/api/automation/dm/commenters", {
              account_id: accountId, media_id: dmMediaId, message: dmMessage, amount: dmAmount,
            })}
          />
        </ActionCard>
      </Section>

      <Toast toast={toast} />
    </div>
  );
}

const ACTION_COLOR: Record<string, string> = {
  like: "text-rose-400",
  follow: "text-emerald-400",
  unfollow: "text-amber-400",
  comment: "text-blue-400",
  reply_comment: "text-violet-400",
  welcome_dm: "text-violet-400",
  dm_commenter: "text-violet-400",
  follower_snapshot: "text-cyan-400",
  post: "text-primary",
  login: "text-muted-foreground",
};

function ActivityLogTab({ accountId }: { accountId: string }) {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!accountId) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/automation/activity-log/${accountId}?limit=200`);
      if (r.ok) setLogs(await r.json());
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter
    ? logs.filter(
        (l) =>
          l.action_type.includes(filter.toLowerCase()) ||
          l.message.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action or message…"
          className={`${inputCls} flex-1 max-w-sm`}
        />
        <button
          onClick={() => { setLoading(true); fetchLogs(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Activity className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyMessage text={filter ? "No matching entries." : "No activity yet."} />
      ) : (
        <div className="space-y-1">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-semibold mr-2 ${ACTION_COLOR[log.action_type] ?? "text-muted-foreground"}`}>
                  {log.action_type.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-foreground">{log.message}</span>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                {new Date(log.created_at).toLocaleString(undefined, {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

function ActionCard({
  icon,
  result,
  resultLabel,
  children,
}: {
  icon: React.ReactNode;
  result?: any;
  resultLabel: (r: any) => string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
      </div>
      {children}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-medium">{resultLabel(result)}</span>
          {result.done_today !== undefined && (
            <span className="text-xs text-muted-foreground">({result.done_today} done today)</span>
          )}
          {result.reason && (
            <span className="text-xs text-amber-400">{result.reason}</span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function RunButton({
  label,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
      {loading ? "Running…" : label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueColor = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function InfoBanner({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/15">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>
  );
}

function Toast({ toast }: { toast: { type: "ok" | "err"; msg: string } | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
            toast.type === "ok"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {toast.type === "ok"
            ? <CheckCircle2 className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
