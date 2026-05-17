"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Video,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/reels", icon: Video, label: "Reels" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-border bg-sidebar h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 ring-1 ring-primary/30 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">Reels</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 h-9 rounded-lg transition-all duration-150 text-sm font-medium",
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

      {/* Bottom: settings + logout */}
      <div className="p-2 border-t border-border space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 h-9 rounded-lg transition-all duration-150 text-sm font-medium",
            isActive("/settings")
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>
        <button
          onClick={() => {
            fetch('/api/auth/logout', { method: 'POST' }).finally(() => router.push('/login'));
          }}
          className="flex w-full items-center gap-3 px-3 h-9 rounded-lg transition-all duration-150 text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.07]"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
