"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
  Menu,
  X,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/carousel", icon: GalleryHorizontal, label: "Carousel" },
  { href: "/reels", icon: Video, label: "Reels" },
  { href: "/publish", icon: Send, label: "Publish" },
  { href: "/accounts", icon: Users, label: "Accounts" },
  { href: "/automation", icon: Bot, label: "Automation" },
  { href: "/svg-editor", icon: PenLine, label: "SVG Editor" },
];

type ApiStatus = "checking" | "online" | "offline";

function ApiStatusIndicator({ status }: { status: ApiStatus }) {
  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
        <span className="hidden sm:inline">Checking…</span>
      </div>
    );
  }
  if (status === "online") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="hidden sm:inline">API Online</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      <span className="hidden sm:inline">API Offline</span>
    </div>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduce = useReducedMotion();
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const drawerVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : -8, scaleY: shouldReduce ? 1 : 0.96 },
    visible: { opacity: 1, y: 0, scaleY: 1 },
    exit: { opacity: 0, y: shouldReduce ? 0 : -8, scaleY: shouldReduce ? 1 : 0.96 },
  };

  return (
    <div className="shrink-0">
      <header className="relative flex items-center h-14 px-4 border-b border-border bg-background/80 backdrop-blur-sm">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">Creator Studio</span>
        </Link>

        {/* Desktop nav — absolutely centered */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-0.5">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-2 px-3 h-8 rounded-md transition-colors duration-150 text-sm font-medium",
                isActive(href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive(href) && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-md bg-primary/20 ring-1 ring-primary/25"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="relative w-4 h-4 shrink-0" />
              <span className="relative">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Right: API status + settings + sign out + mobile toggle */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <ApiStatusIndicator status={apiStatus} />
          <div className="h-4 w-px bg-border hidden sm:block" />
          <Link
            href="/settings"
            className={cn(
              "hidden sm:flex items-center px-2 h-8 rounded-md transition-colors duration-150",
              isActive("/settings") ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
            )}
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={() => fetch("/api/auth/logout", { method: "POST" }).finally(() => router.push("/login"))}
            className="hidden sm:flex items-center px-2 h-8 rounded-md transition-colors duration-150 text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.07]"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 top-14 z-40 bg-background/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer panel */}
            <motion.div
              key="drawer"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={{ transformOrigin: "top" }}
              className="absolute left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md shadow-xl md:hidden"
            >
              <nav className="flex flex-col p-3 gap-0.5">
                {NAV_ITEMS.map(({ href, icon: Icon, label }, i) => (
                  <motion.div
                    key={href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.03 }}
                  >
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors",
                        isActive(href)
                          ? "bg-primary/20 text-primary ring-1 ring-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </Link>
                  </motion.div>
                ))}
                <div className="h-px bg-border my-1" />
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors",
                    isActive("/settings") ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
                  )}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Settings
                </Link>
                <button
                  onClick={() => fetch("/api/auth/logout", { method: "POST" }).finally(() => router.push("/login"))}
                  className="flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.07] transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign out
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
