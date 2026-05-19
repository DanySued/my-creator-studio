"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GalleryHorizontal,
  Video,
  Send,
  Users,
  Settings,
  Sparkles,
  Bot,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/carousel", icon: GalleryHorizontal, label: "Carousel" },
  { href: "/reels", icon: Video, label: "Reels" },
  { href: "/publish", icon: Send, label: "Publish" },
  { href: "/accounts", icon: Users, label: "Accounts" },
  { href: "/automation", icon: Bot, label: "Automation" },
];

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
  const router = useRouter();
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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
    <header className="relative flex items-center h-14 px-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">Creator Studio</span>
      </div>

      {/* Nav links — absolutely centered */}
      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 h-8 rounded-md transition-all duration-150 text-sm font-medium",
              isActive(href)
                ? "bg-primary/20 text-primary ring-1 ring-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Right: API status + settings + sign out */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <ApiStatusIndicator status={apiStatus} />
        <div className="h-4 w-px bg-border" />
        <Link
          href="/settings"
          className={cn(
            "flex items-center px-2 h-8 rounded-md transition-all duration-150",
            isActive("/settings")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
          )}
        >
          <Settings className="w-4 h-4" />
        </Link>
        <button
          onClick={() => {
            fetch("/api/auth/logout", { method: "POST" }).finally(() => router.push("/login"));
          }}
          className="flex items-center px-2 h-8 rounded-md transition-all duration-150 text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.07]"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
