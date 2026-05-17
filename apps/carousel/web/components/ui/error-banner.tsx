import { AlertCircle } from 'lucide-react';

export function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-sm ${className ?? ''}`}>
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{message}</span>
    </div>
  );
}
