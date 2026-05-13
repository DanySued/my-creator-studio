"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// ── Inner component (needs useSearchParams inside Suspense) ───────────────────

function CallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const username = searchParams.get("username");

    if (success) {
      setStatus("success");
      setMessage(
        username ? `@${username} connected successfully!` : "Account connected!"
      );
    } else if (error) {
      setStatus("error");
      setMessage(decodeURIComponent(error.replace(/\+/g, " ")));
    }

    // Auto-redirect to /accounts after a short delay
    const delay = success ? 2000 : 3500;
    const timer = setTimeout(() => router.replace("/accounts"), delay);
    return () => clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-5 text-center max-w-sm">
        {/* Icon */}
        {status === "loading" && (
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
        )}
        {status === "success" && (
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        )}
        {status === "error" && (
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            {status === "loading" && "Connecting…"}
            {status === "success" && "Connected!"}
            {status === "error" && "Connection failed"}
          </h1>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>

        {/* Redirect notice */}
        {status !== "loading" && (
          <p className="text-xs text-muted-foreground">
            Redirecting you back to Accounts…
          </p>
        )}

        {/* Manual link fallback */}
        {status === "error" && (
          <button
            onClick={() => router.replace("/accounts")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Accounts →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page wrapper with Suspense boundary ───────────────────────────────────────

export default function InstagramCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
