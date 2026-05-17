"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Status = "idle" | "checking" | "ok" | "error";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  envKey: string;
  placeholder: string;
  docsUrl: string;
  setupSteps: string[];
  troubleshoot: string[];
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Powers carousel AI generation",
    envKey: "GEMINI_API_KEY",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com",
    setupSteps: [
      "Go to aistudio.google.com and sign in with your Google account",
      "Click 'Get API key' in the top navigation",
      "Click 'Create API key' — choose any Google Cloud project or create a new one",
      "Copy the key and paste it below",
      "Click 'Test connection' to verify it works",
    ],
    troubleshoot: [
      "Invalid key: make sure you copied the full key starting with 'AIza'",
      "Quota exceeded: wait a minute (free tier is 15 requests/min) or check aistudio.google.com/usage",
      "Model not found: the free tier includes gemini-2.5-flash — no changes needed",
    ],
  },
  {
    id: "pexels",
    name: "Pexels",
    description: "Stock footage for reel generation",
    envKey: "PEXELS_API_KEY",
    placeholder: "563492ad6f...",
    docsUrl: "https://www.pexels.com/api/",
    setupSteps: [
      "Go to pexels.com and create a free account",
      "Navigate to pexels.com/api in the top menu",
      "Click 'Your API key' — it may take a moment to appear",
      "Copy the key and paste it below",
      "Click 'Test connection' to verify",
    ],
    troubleshoot: [
      "No results for keyword: try more generic terms (e.g. 'nature' instead of 'sunset beach brazil')",
      "Rate limit: free tier allows 200 requests/hour — the app throttles automatically",
      "Key invalid: regenerate from pexels.com/api and paste again",
    ],
  },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "checking") return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
  if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-destructive" />;
  return <div className="w-4 h-4 rounded-full border-2 border-border" />;
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "checking") return <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">Checking…</Badge>;
  if (status === "ok") return <Badge variant="outline" className="border-emerald-400/30 text-emerald-400 text-[10px]">Connected</Badge>;
  if (status === "error") return <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px]">Error</Badge>;
  return <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">Not configured</Badge>;
}

function IntegrationCard({ config }: { config: IntegrationConfig }) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const testConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      setStatus("error");
      setErrorMsg("Paste your API key first.");
      return;
    }
    setStatus("checking");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/health/${config.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      if (res.ok) {
        setStatus("ok");
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setErrorMsg(data.error ?? "Connection failed. Check the troubleshooting guide below.");
        setShowGuide(true);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Could not reach the backend. Make sure it's running (docker compose up).");
      setShowGuide(true);
    }
  }, [apiKey, config.id]);

  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon status={status} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{config.name}</span>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
          </div>
        </div>
        <a
          href={config.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config.placeholder}
            className="w-full h-9 px-3 pr-9 text-xs rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={testConnection}
          disabled={status === "checking"}
          className={cn(
            "h-9 px-4 text-xs font-medium rounded-lg transition-all duration-150",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          )}
        >
          {status === "checking" ? "Testing…" : "Test"}
        </button>
      </div>

      {errorMsg && (
        <p className="text-xs text-destructive mb-3 flex items-start gap-1.5">
          <XCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {errorMsg}
        </p>
      )}

      {status === "ok" && (
        <p className="text-xs text-emerald-400 mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Connected — key saved to backend
        </p>
      )}

      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {status === "error" ? "Troubleshooting guide" : "Setup guide"}
      </button>

      {showGuide && (
        <div className="mt-3 pt-3 border-t border-border space-y-4">
          <div>
            <p className="text-xs font-medium text-foreground mb-2">How to get your API key</p>
            <ol className="space-y-1.5">
              {config.setupSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 text-primary font-medium">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          {status === "error" && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Common issues</p>
              <ul className="space-y-1.5">
                {config.troubleshoot.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 text-amber-400">→</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-1">API Connections</h2>
        <p className="text-xs text-muted-foreground mb-4">
          These keys are stored locally in the backend and never leave your machine.
        </p>
        <div className="space-y-3">
          {INTEGRATIONS.map((config) => (
            <IntegrationCard key={config.id} config={config} />
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-1">Backend Service</h2>
        <p className="text-xs text-muted-foreground mb-4">
          The Python backend must be running for all features to work.
        </p>
        <Card className="p-5 bg-card border-border">
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-foreground">How to start the backend</span>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs text-muted-foreground space-y-1">
              <p className="text-foreground"># From the project root:</p>
              <p>docker compose up</p>
              <p className="text-muted-foreground"># Opens the app at http://localhost:3000</p>
            </div>
            <div className="space-y-1.5">
              {[
                "Make sure Docker Desktop is open and running",
                "First run will take 2–3 minutes to download dependencies",
                "Subsequent starts take under 10 seconds",
                "Use Ctrl+C in the terminal to stop",
              ].map((tip, i) => (
                <p key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="text-primary">→</span>
                  {tip}
                </p>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
