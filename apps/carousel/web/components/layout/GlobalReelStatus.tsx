'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { useReelGenerationContext } from '@/lib/ReelGenerationContext';

export function GlobalReelStatus() {
  const { jobs, isGenerating, isDismissed, dismiss } = useReelGenerationContext();
  const pathname = usePathname();
  const router = useRouter();

  const onReelsPage = pathname === '/reels';
  const hasActivity = jobs.length > 0 || isGenerating;
  const allSettled =
    jobs.length > 0 && jobs.every((j) => j.status === 'done' || j.status === 'failed');
  const awaitingApproval = jobs.some((j) => j.status === 'awaiting_clip_approval');
  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const activeJob = jobs.find((j) => j.status !== 'done' && j.status !== 'failed') ?? jobs[0];
  const currentPhase: 1 | 2 = activeJob?.phase ?? 1;
  const overallProgress =
    jobs.length > 0
      ? Math.round(jobs.reduce((sum, j) => sum + (j.phase_progress ?? j.progress), 0) / jobs.length)
      : 0;

  // Show when: off the reels page, something is happening, and not dismissed
  const visible = !onReelsPage && hasActivity && !isDismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="reel-status"
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-surface-panel border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md min-w-[220px]">
            {!allSettled ? (
              /* ── Generating / Awaiting Approval ── */
              <>
                <Loader2
                  className={`w-7 h-7 shrink-0 animate-spin ${awaitingApproval ? 'text-amber-400' : 'text-blue-400'}`}
                  style={{ animationDuration: '1.8s' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {awaitingApproval
                      ? 'Review clips →'
                      : jobs.length > 1
                        ? `Generating ${jobs.length} reels…`
                        : 'Generating reel…'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {awaitingApproval
                      ? 'Tap to approve or swap clips'
                      : `Phase ${currentPhase} of 2 — ${overallProgress}%`}
                  </p>
                </div>
              </>
            ) : (
              /* ── Done ── */
              <>
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">
                    {doneCount} reel{doneCount !== 1 ? 's' : ''} ready!
                  </p>
                  <button
                    onClick={() => {
                      dismiss();
                      router.push('/reels');
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    View results →
                  </button>
                </div>
                <button
                  onClick={dismiss}
                  className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
