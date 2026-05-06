"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GalleryHorizontal,
  Video,
  Send,
  Users,
  Settings,
  Sparkles,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/carousel", icon: GalleryHorizontal, label: "Carousel" },
  { href: "/reels", icon: Video, label: "Reels" },
  { href: "/publish", icon: Send, label: "Publish" },
  { href: "/accounts", icon: Users, label: "Accounts" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="flex flex-col w-16 shrink-0 border-r border-border bg-sidebar h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 ring-1 ring-primary/30">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Tooltip key={href}>
            <TooltipTrigger>
              <Link
                href={href}
                className={cn(
                  "flex items-center justify-center w-full h-10 rounded-lg transition-all duration-150",
                  isActive(href)
                    ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-2 border-t border-border">
        <Tooltip>
          <TooltipTrigger>
            <Link
              href="/settings"
              className={cn(
                "flex items-center justify-center w-full h-10 rounded-lg transition-all duration-150",
                isActive("/settings")
                  ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Settings className="w-[18px] h-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Settings
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
