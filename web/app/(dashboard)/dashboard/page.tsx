"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  GalleryHorizontal,
  Video,
  Send,
  ArrowRight,
  Users,
  Bot,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TOOLS = [
  {
    href: "/carousel",
    icon: GalleryHorizontal,
    label: "Carousel",
    description: "Upload a document and let AI turn it into beautiful Instagram carousel slides.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    ring: "group-hover:ring-violet-400/20",
  },
  {
    href: "/reels",
    icon: Video,
    label: "Reels",
    description: "Enter keywords, pick a track, and generate a 1080×1920 short-form video automatically.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    ring: "group-hover:ring-blue-400/20",
  },
  {
    href: "/publish",
    icon: Send,
    label: "Publish",
    description: "Post immediately or schedule content across your Instagram accounts.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "group-hover:ring-emerald-400/20",
  },
  {
    href: "/accounts",
    icon: Users,
    label: "Accounts",
    description: "Connect and manage your Instagram accounts for publishing and automation.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    ring: "group-hover:ring-pink-400/20",
  },
  {
    href: "/automation",
    icon: Bot,
    label: "Automation",
    description: "Set up auto-reply rules, follower tracking, welcome DMs, and growth actions.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "group-hover:ring-amber-400/20",
  },
];

function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <Card className="p-5 bg-card border-border">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      )}
    </Card>
  );
}

export default function OverviewPage() {
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((data) => setAccountCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setAccountCount(0))
      .finally(() => setLoadingAccounts(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg">
          Create carousels, generate reels, and publish to Instagram — your personal content engine.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Connected accounts"
          value={accountCount !== null ? String(accountCount) : "—"}
          loading={loadingAccounts}
        />
        <StatCard label="Reels generated" value="—" />
        <StatCard label="Posts published" value="—" />
      </div>

      {/* Tools grid */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Tools
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map(({ href, icon: Icon, label, description, color, bg, ring }) => (
            <Link key={href} href={href} className="group">
              <Card
                className={`h-full p-5 bg-card border-border hover:border-border/80 ring-1 ring-transparent ${ring} transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer`}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-5">{description}</p>
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                >
                  Open <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
