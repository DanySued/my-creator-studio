"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate } from "motion/react";
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
import { SlideCard, Slide } from "@/components/carousel/SlideCard";
import { getTheme } from "@/lib/carouselThemes";

const TOOLS = [
  {
    href: "/carousel",
    icon: GalleryHorizontal,
    label: "Carousel",
    description: "Upload a document and let AI turn it into beautiful Instagram carousel slides.",
    color: "text-violet-400",
    bg: "bg-violet-400/15",
    ring: "group-hover:ring-violet-400/30",
    glow: "group-hover:shadow-violet-500/20",
  },
  {
    href: "/reels",
    icon: Video,
    label: "Reels",
    description: "Enter keywords, pick a track, and generate a 1080×1920 short-form video automatically.",
    color: "text-blue-400",
    bg: "bg-blue-400/15",
    ring: "group-hover:ring-blue-400/30",
    glow: "group-hover:shadow-blue-500/20",
  },
  {
    href: "/publish",
    icon: Send,
    label: "Publish",
    description: "Post immediately or schedule content across your Instagram accounts.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/15",
    ring: "group-hover:ring-emerald-400/30",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    href: "/accounts",
    icon: Users,
    label: "Accounts",
    description: "Connect and manage your Instagram accounts for publishing and automation.",
    color: "text-pink-400",
    bg: "bg-pink-400/15",
    ring: "group-hover:ring-pink-400/30",
    glow: "group-hover:shadow-pink-500/20",
  },
  {
    href: "/automation",
    icon: Bot,
    label: "Automation",
    description: "Set up auto-reply rules, follower tracking, welcome DMs, and growth actions.",
    color: "text-amber-400",
    bg: "bg-amber-400/15",
    ring: "group-hover:ring-amber-400/30",
    glow: "group-hover:shadow-amber-500/20",
  },
];

function AnimatedCount({ value, loading }: { value: number | null; loading: boolean }) {
  const motionVal = useMotionValue(0);
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView || loading || value === null) return;
    const controls = animate(motionVal, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(String(Math.round(v))),
    });
    return controls.stop;
  }, [isInView, loading, value, motionVal]);

  if (loading) return <Skeleton variant="shimmer" className="h-8 w-12 mt-1" />;
  if (value === null) return <p className="text-2xl font-bold text-foreground tabular-nums">—</p>;
  return <p ref={ref} className="text-2xl font-bold text-foreground tabular-nums">{display}</p>;
}

function StatCard({ label, value, loading }: { label: string; value: number | null; loading?: boolean }) {
  return (
    <Card className="p-5 bg-card border-border">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <AnimatedCount value={value} loading={!!loading} />
    </Card>
  );
}

interface DraftData {
  slides: Slide[];
  themeId: string;
  savedAt: number;
}

function RecentDrafts() {
  const [draft, setDraft] = useState<DraftData | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('carousel_draft');
      if (raw) {
        const d = JSON.parse(raw) as DraftData;
        if (d.slides?.length > 0) setDraft(d);
      }
    } catch { /* ignore */ }
  }, []);

  if (!draft) return null;

  const timeAgo = (ts: number) => {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  const theme = getTheme(draft.themeId);
  const PREVIEW_SCALE = 36 / 1080;
  const cardW = Math.round(1080 * PREVIEW_SCALE);
  const cardH = Math.round(1350 * PREVIEW_SCALE);

  return (
    <div className="mt-10">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
        Continue where you left off
      </h3>
      <Link href="/carousel">
        <Card className="p-4 bg-card border-border hover:border-primary/30 ring-1 ring-transparent hover:ring-primary/20 transition-all cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="flex gap-1 shrink-0">
              {draft.slides.slice(0, 3).map((s: Slide, i: number) => (
                <div
                  key={i}
                  className="rounded-sm overflow-hidden opacity-90"
                  style={{ width: cardW, height: cardH }}
                >
                  <SlideCard slide={s} theme={theme} scale={PREVIEW_SCALE} />
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {draft.slides[0]?.title || 'Untitled carousel'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {draft.slides.length} slides · {theme.name} theme · {timeAgo(draft.savedAt)}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </Card>
      </Link>
    </div>
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
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-violet-950/70 via-indigo-950/50 to-background"
          style={{ y: scrollY * 0.4 }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.18) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            y: scrollY * 0.25,
          }}
        />
        <motion.div
          className="absolute -top-16 right-[8%] w-[420px] h-[420px] rounded-full bg-violet-500/30 blur-[90px]"
          style={{ y: scrollY * 0.18 }}
        />
        <motion.div
          className="absolute top-[15%] -left-16 w-80 h-80 rounded-full bg-indigo-600/25 blur-[70px]"
          style={{ y: scrollY * 0.12 }}
        />
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-32 rounded-full bg-violet-600/10 blur-[60px]"
          style={{ y: scrollY * 0.08 }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <motion.div
          className="relative z-10 px-8 pb-10 w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
        {/* Stats — individually staggered */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Connected accounts", value: accountCount, loading: loadingAccounts },
            { label: "Reels generated", value: null, loading: false },
            { label: "Posts published", value: null, loading: false },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Tools grid */}
        <div>
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.28 }}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4"
          >
            Tools
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map(({ href, icon: Icon, label, description, color, bg, ring, glow }, i) => (
              <motion.div
                key={href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href={href} className="group block h-full">
                  <Card
                    className={`h-full p-5 bg-card border-border hover:border-border/80 ring-1 ring-transparent ${ring} transition-all duration-200 hover:shadow-xl ${glow} cursor-pointer`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1.5">{label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-5">{description}</p>
                    <div
                      className={`flex items-center gap-1 text-xs font-medium ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-150`}
                    >
                      Open
                      <ArrowRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-1" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <RecentDrafts />
      </div>
    </div>
  );
}
