"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  GalleryHorizontal,
  Video,
  Send,
  ArrowRight,
  Users,
  Bot,
  Sparkles,
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
    bg: "bg-violet-400/15",
    ring: "group-hover:ring-violet-400/30",
  },
  {
    href: "/reels",
    icon: Video,
    label: "Reels",
    description: "Enter keywords, pick a track, and generate a 1080×1920 short-form video automatically.",
    color: "text-blue-400",
    bg: "bg-blue-400/15",
    ring: "group-hover:ring-blue-400/30",
  },
  {
    href: "/publish",
    icon: Send,
    label: "Publish",
    description: "Post immediately or schedule content across your Instagram accounts.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/15",
    ring: "group-hover:ring-emerald-400/30",
  },
  {
    href: "/accounts",
    icon: Users,
    label: "Accounts",
    description: "Connect and manage your Instagram accounts for publishing and automation.",
    color: "text-pink-400",
    bg: "bg-pink-400/15",
    ring: "group-hover:ring-pink-400/30",
  },
  {
    href: "/automation",
    icon: Bot,
    label: "Automation",
    description: "Set up auto-reply rules, follower tracking, welcome DMs, and growth actions.",
    color: "text-amber-400",
    bg: "bg-amber-400/15",
    ring: "group-hover:ring-amber-400/30",
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

export default function DashboardPage() {
  const [scrollY, setScrollY] = useState(0);
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    const container = document.querySelector("main");
    if (!container) return;
    const handler = () => setScrollY(container.scrollTop);
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    fetch("/api/instagram/accounts")
      .then((r) => r.json())
      .then((data) => setAccountCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setAccountCount(0))
      .finally(() => setLoadingAccounts(false));
  }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden h-80 flex items-end">
        {/* Deep gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-violet-950/70 via-indigo-950/50 to-background"
          style={{ y: scrollY * 0.4 }}
        />

        {/* Dot grid */}
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(139,92,246,0.18) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            y: scrollY * 0.25,
          }}
        />

        {/* Orb — top right */}
        <motion.div
          className="absolute -top-16 right-[8%] w-[420px] h-[420px] rounded-full bg-violet-500/30 blur-[90px]"
          style={{ y: scrollY * 0.18 }}
        />

        {/* Orb — mid left */}
        <motion.div
          className="absolute top-[15%] -left-16 w-80 h-80 rounded-full bg-indigo-600/25 blur-[70px]"
          style={{ y: scrollY * 0.12 }}
        />

        {/* Orb — bottom center */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-32 rounded-full bg-violet-600/10 blur-[60px]"
          style={{ y: scrollY * 0.08 }}
        />

        {/* Bottom fade into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        {/* Content */}
        <motion.div
          className="relative z-10 px-8 pb-10 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/20 ring-1 ring-primary/30">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <span className="text-[11px] font-semibold text-primary/70 uppercase tracking-[0.18em]">
              Creator Studio
            </span>
          </div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight leading-none mb-3">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Create carousels, generate reels, and publish to Instagram —{" "}
            <span className="text-foreground/70">your personal content engine.</span>
          </p>
        </motion.div>
      </section>

      {/* ── Body ── */}
      <div className="px-8 max-w-5xl mx-auto pb-12 pt-10">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <StatCard
            label="Connected accounts"
            value={accountCount !== null ? String(accountCount) : "—"}
            loading={loadingAccounts}
          />
          <StatCard label="Reels generated" value="—" />
          <StatCard label="Posts published" value="—" />
        </motion.div>

        {/* Tools grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
        >
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
        </motion.div>
      </div>
    </div>
  );
}
