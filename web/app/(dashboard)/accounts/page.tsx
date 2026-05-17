"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  X,
  Trash2,
  AtSign,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  ExternalLink,
  Upload,
} from "lucide-react";
import { Account } from "@/lib/types";
import { ErrorBanner } from "@/components/ui/error-banner";
import { AccountAvatar } from "@/components/ui/account-avatar";

type ModalStep = "form" | "2fa" | "challenge" | "import";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/accounts");
      if (res.ok) setAccounts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this account? This cannot be undone.")) return;
    setRemovingId(id);
    try {
      await fetch(`/api/instagram/accounts/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setRemovingId(null);
    }
  };

  const handleConnected = (account: Account) => {
    setAccounts((prev) => {
      const exists = prev.find((a) => a.id === account.id);
      return exists
        ? prev.map((a) => (a.id === account.id ? account : a))
        : [account, ...prev];
    });
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Instagram accounts to publish and schedule content.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                removing={removingId === account.id}
                onRemove={() => handleRemove(account.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <ConnectModal
            onClose={() => setShowModal(false)}
            onConnected={handleConnected}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-4">
        <AtSign className="w-8 h-8 text-pink-400" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-1">No accounts yet</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Connect an Instagram account to start publishing reels and carousels directly from Creator Studio.
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Connect Account
      </button>
    </motion.div>
  );
}

function AccountCard({
  account,
  removing,
  onRemove,
}: {
  account: Account;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      className="relative rounded-2xl border border-border bg-card p-5 flex items-start gap-4 group"
    >
      <AccountAvatar avatarUrl={account.avatar_url} username={account.username} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-foreground truncate">@{account.username}</span>
          <StatusBadge status={account.status} />
        </div>
        {account.full_name && (
          <p className="text-xs text-muted-foreground mb-2 truncate">{account.full_name}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
          <span><span className="font-semibold text-foreground">{fmt(account.follower_count)}</span> followers</span>
          <span><span className="font-semibold text-foreground">{fmt(account.following_count)}</span> following</span>
        </div>
        {account.auth_method === "oauth" ? (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/35">
            Official API
          </span>
        ) : (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            Password login
          </span>
        )}
      </div>

      <button
        onClick={onRemove}
        disabled={removing}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        title="Remove account"
      >
        {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Connected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/35">
      <AlertCircle className="w-2.5 h-2.5" />
      Disconnected
    </span>
  );
}

function ConnectModal({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: (account: Account) => void;
}) {
  const [step, setStep] = useState<ModalStep>("form");
  const [pendingId, setPendingId] = useState("");
  const [challengeType, setChallengeType] = useState<"email" | "sms">("email");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOAuth = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const res = await fetch("/api/instagram/oauth/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Could not start OAuth flow");
      window.location.href = data.auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setOauthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/instagram/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Login failed");
      if (data.status === "connected") {
        onConnected(data);
      } else if (data.status === "2fa_required") {
        setPendingId(data.pending_id);
        setStep("2fa");
      } else if (data.status === "challenge_required") {
        setPendingId(data.pending_id);
        setChallengeType(data.challenge_type ?? "email");
        setStep("challenge");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (endpoint: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/instagram/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pending_id: pendingId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Verification failed");
      if (data.status === "connected") onConnected(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const [importUsername, setImportUsername] = useState("");
  const [importSession, setImportSession] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const handleImport = async () => {
    if (!importUsername.trim() || !importSession.trim()) return;
    setImportLoading(true);
    setError("");
    try {
      const res = await fetch("/api/instagram/accounts/import-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: importUsername.trim(), session_data: importSession.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Import failed");
      if (data.status === "connected") onConnected(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  const stepTitle =
    step === "form" ? "Connect Instagram" :
    step === "2fa" ? "Two-Factor Auth" :
    step === "import" ? "Import Session" :
    "Verify Identity";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
              <AtSign className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground">{stepTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === "form" && (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">
                      Login with Instagram{" "}
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 ml-1">
                        Recommended
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Official Meta OAuth — requires a Professional (Business or Creator) account.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOAuth}
                    disabled={oauthLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {oauthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    {oauthLoading ? "Redirecting…" : "Continue with Instagram"}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or use password</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <p className="text-xs text-muted-foreground -mt-1">
                  Enter your Instagram credentials. Sessions are stored locally and never sent to third-party servers.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username</label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Connecting…" : "Connect"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep("import"); setError(""); }}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3 h-3" />
                  Import session from local instance
                </button>
              </motion.form>
            )}

            {step === "2fa" && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25">
                  <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">2FA Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 tracking-widest text-center font-mono text-lg"
                  />
                </div>
                {error && <ErrorBanner message={error} />}
                <button
                  onClick={() => handleVerify("accounts/verify-2fa")}
                  disabled={loading || code.length < 6}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Verifying…" : "Verify"}
                </button>
                <button
                  onClick={() => { setStep("form"); setCode(""); setError(""); }}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to login
                </button>
              </motion.div>
            )}

            {step === "import" && (
              <motion.div
                key="import"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <p className="text-xs text-muted-foreground">
                  Login locally (Docker), then call{" "}
                  <code className="px-1 py-0.5 rounded bg-secondary text-foreground font-mono text-[11px]">
                    GET /instagram/accounts/&#123;id&#125;/export-session
                  </code>{" "}
                  on localhost:8000 and paste the result below.
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username</label>
                  <input
                    type="text"
                    value={importUsername}
                    onChange={(e) => setImportUsername(e.target.value)}
                    placeholder="@yourhandle"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Session JSON</label>
                  <textarea
                    value={importSession}
                    onChange={(e) => setImportSession(e.target.value)}
                    placeholder='{"uuids": {...}, "cookies": {...}, ...}'
                    rows={5}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono resize-none"
                  />
                </div>
                {error && <ErrorBanner message={error} />}
                <button
                  onClick={handleImport}
                  disabled={importLoading || !importUsername || !importSession}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importLoading ? "Importing…" : "Import & Connect"}
                </button>
                <button
                  onClick={() => { setStep("form"); setError(""); }}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to login
                </button>
              </motion.div>
            )}

            {step === "challenge" && (
              <motion.div
                key="challenge"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Instagram sent a verification code to your{" "}
                    <span className="font-semibold text-foreground">
                      {challengeType === "sms" ? "phone" : "email"}
                    </span>
                    . Enter it below.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 tracking-widest text-center font-mono text-lg"
                  />
                </div>
                {error && <ErrorBanner message={error} />}
                <button
                  onClick={() => handleVerify("accounts/verify-challenge")}
                  disabled={loading || code.length < 4}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Verifying…" : "Verify"}
                </button>
                <button
                  onClick={() => { setStep("form"); setCode(""); setError(""); }}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to login
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
