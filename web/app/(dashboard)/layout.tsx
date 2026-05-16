import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { GlobalReelStatus } from "@/components/layout/GlobalReelStatus";
import { PageTransition } from "@/components/layout/PageTransition";
import { ReelGenerationProvider } from "@/lib/ReelGenerationContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReelGenerationProvider>
      <div className="flex h-full bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <GlobalReelStatus />
    </ReelGenerationProvider>
  );
}
