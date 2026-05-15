import Link from "next/link";
import { GalleryHorizontal, Video, Send, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TOOLS = [
  {
    href: "/carousel",
    icon: GalleryHorizontal,
    label: "Carousel",
    description: "Upload a document and let AI turn it into beautiful Instagram carousel slides.",
    status: "ready",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    href: "/reels",
    icon: Video,
    label: "Reels",
    description: "Enter keywords, pick a track, and generate a 1080×1920 short-form video automatically.",
    status: "ready",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    href: "/publish",
    icon: Send,
    label: "Publish",
    description: "Post immediately or schedule content across your Instagram accounts.",
    status: "setup",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

export default function OverviewPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-widest">My Creator Studio</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Create carousels, generate reels, and publish to Instagram — all in one place.
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOOLS.map(({ href, icon: Icon, label, description, status, color, bg }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full p-5 bg-card border-border hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-foreground">{label}</span>
                {status === "setup" && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-400/30 text-amber-400">
                    Setup needed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{description}</p>
              <div className={`flex items-center gap-1 text-xs font-medium ${color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Open <ArrowRight className="w-3 h-3" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { label: "Carousels created", value: "—" },
          { label: "Reels generated", value: "—" },
          { label: "Posts published", value: "—" },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
