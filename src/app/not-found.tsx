'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, Home, Sparkles } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-surface-border text-center max-w-lg w-full space-y-6 shadow-neon-cyan relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-surface border border-surface-border text-primary shadow-inner">
          <Compass className="w-12 h-12 stroke-[1.5] animate-spin text-primary" style={{ animationDuration: '10s' }} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-secondary tracking-widest uppercase">
              Error Code: 404
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-cyber font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-200 to-secondary tracking-wide">
            HALAMAN TIDAK DITEMUKAN
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-sm mx-auto">
            Halaman yang kamu tuju tidak tersedia atau telah dipindahkan ke sektor lain.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-black/50 border border-surface-border/80 font-mono text-xs text-primary flex items-center justify-center gap-2">
          <span>Mengalihkan ke beranda dalam</span>
          <strong className="text-sm text-secondary font-bold px-2 py-0.5 rounded bg-surface border border-surface-border">
            {countdown}
          </strong>
          <span>detik...</span>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-cyber font-bold text-xs hover:bg-white transition-all shadow-neon-cyan active:scale-95"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
