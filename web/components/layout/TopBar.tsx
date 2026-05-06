"use client";

import { usePathname } from "next/navigation";
import { Circle } from "lucide-react";

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Overview", description: "Your content studio at a glance" },
  "/carousel": { title: "Carousel", description: "Generate Instagram carousel slides from documents" },
  "/reels": { title: "Reels", description: "Create short-form videos from keywords and audio" },
  "/publish": { title: "Publish", description: "Post and schedule content to your Instagram accounts" },
  "/accounts": { title: "Accounts", description: "Manage your connected Instagram accounts" },
  "/settings": { title: "Settings", description: "Configure API connections and preferences" },
};

function getPageMeta(pathname: string) {
  for (const [path, meta] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return meta;
  }
  return { title: "My Creator Studio", description: "" };
}

export default function TopBar() {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-foreground leading-none">{meta.title}</h1>
        {meta.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
        )}
      </div>

      {/* API status indicator — will be dynamic in Phase 1.4 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Circle className="w-1.5 h-1.5 fill-amber-400 text-amber-400" />
          <span>Setup required</span>
        </div>
      </div>
    </header>
  );
}
