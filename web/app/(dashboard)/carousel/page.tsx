import { GalleryHorizontal, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CarouselPage() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="p-10 text-center bg-card border-border max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl bg-violet-400/10 flex items-center justify-center mx-auto mb-4">
          <GalleryHorizontal className="w-7 h-7 text-violet-400" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-base font-semibold text-foreground">Carousel Generator</h2>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Phase 2</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Upload a PDF, DOCX, or TXT document and AI will generate ready-to-post
          Instagram carousel slides with your chosen theme, language, and style.
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-muted-foreground">
          <Construction className="w-3.5 h-3.5" />
          Coming in Phase 2
        </div>
      </Card>
    </div>
  );
}
