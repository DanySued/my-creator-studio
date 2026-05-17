"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Overview", description: "Your content studio at a glance" },
  "/carousel": { title: "Carousel", description: "Generate Instagram carousel slides from documents" },
  "/reels": { title: "Reels", description: "Create short-form videos from keywords and audio" },
  "/publish": { title: "Publish", description: "Post and schedule content to your Instagram accounts" },
  "/accounts": { title: "Accounts", description: "Manage your connected Instagram accounts" },
  "/automation": { title: "Automation", description: "Auto-reply, follower tracking, and growth actions" },
  "/settings": { title: "Settings", description: "Configure API connections and preferences" },
};

function getPageMeta(pathname: string) {
  for (const [path, meta] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return meta;
  }
  return { title: "My Creator Studio", description: "" };
}

type ApiStatus = "checking" | "online" | "offline";

function ApiStatusIndicator({ status }: { status: ApiStatus }) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
        <span>Checking…</span>
      </div>
    );
  }
  if (status === "online") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>API Online</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      <span>API Offline</span>
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health/backend", { cache: "no-store" });
        setApiStatus(res.ok ? "online" : "offline");
      } catch {
        setApiStatus("offline");
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-foreground leading-none">{meta.title}</h1>
        {meta.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
        )}
      </div>
      <ApiStatusIndicator status={apiStatus} />
    </header>
  );
}
