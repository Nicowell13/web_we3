'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, ShieldCheck, LogIn, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    if (!loading && user) {
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, redirectUrl, router]);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal login dengan Google. Silakan coba lagi.');
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-surface-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-3 mb-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-primary/40 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {redirectUrl ? 'Konfirmasi Akun Checkout' : 'WETRI Membership'}
          </div>

          <h1 className="font-cyber text-2xl sm:text-3xl font-extrabold text-white">
            {redirectUrl ? 'MASUK UNTUK TRANSAKSI' : 'MASUK KE AKUN'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300">
            {redirectUrl
              ? 'Akun diperlukan agar riwayat pesanan, status pengiriman, dan cashback poin Anda tersimpan aman.'
              : 'Nikmati cashback points, daily streak reward, dan kemudahan pelacakan transaksi.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/50 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4 relative z-10">
          <button
            disabled={signingIn || loading}
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 rounded-xl bg-surface border border-primary/60 hover:border-primary hover:shadow-neon-cyan text-white font-cyber font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4 text-primary" />
            <span>{signingIn ? 'Menghubungkan Akun...' : 'Lanjut dengan Akun Google'}</span>
          </button>

          <div className="p-4 rounded-xl bg-black/40 border border-surface-border space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Aman & Terintegrasi DOKU Gateway</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-secondary shrink-0" />
              <span>Otomatis dapat Loyalty Cashback Poin</span>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link href="/" className="text-xs text-slate-400 hover:text-primary transition-colors inline-flex items-center gap-1">
              <span>Kembali ke Beranda</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-slate-400 text-sm">Memuat halaman login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
