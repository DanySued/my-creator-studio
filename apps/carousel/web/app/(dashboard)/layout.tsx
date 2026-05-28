import TopBar from "@/components/layout/TopBar";
import { PageTransition } from "@/components/layout/PageTransition";
import { Toaster } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar />
      <main className="flex-1 overflow-y-auto">
        <PageTransition>{children}</PageTransition>
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
