'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

function LoginForm() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Invalid password');
        return;
      }
      router.push(searchParams.get('next') || '/dashboard');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">
          Password
        </label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoFocus
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 pr-10 transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '0.5rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={loading || !password}
        className="w-full py-2.5 bg-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </motion.button>
    </form>
  );
}

export default function LoginPage() {
  const shouldReduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: shouldReduce ? 0 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center mb-8"
        >
          <motion.div
            animate={shouldReduce ? {} : { y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/40 flex items-center justify-center mb-4 shadow-xl shadow-primary/20"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Creator Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal content automation hub</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: shouldReduce ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="glass rounded-2xl p-6 shadow-2xl shadow-black/40"
        >
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">Welcome back</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter your password to access the studio</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-xs text-muted-foreground/40 mt-5"
        >
          Private access only · Your data stays yours
        </motion.p>
      </div>
    </div>
  );
}
