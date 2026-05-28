import TopBar from "@/components/layout/TopBar";
import { GlobalReelStatus } from "@/components/layout/GlobalReelStatus";
import { PageTransition } from "@/components/layout/PageTransition";
import { ReelGenerationProvider } from "@/lib/ReelGenerationContext";
import { Toaster } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReelGenerationProvider>
      <div className="flex flex-col h-full bg-background">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <GlobalReelStatus />
      <Toaster richColors position="bottom-right" />
    </ReelGenerationProvider>
  );
}
