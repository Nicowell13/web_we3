'use client';

import Link from 'next/link';
import { Gamepad2, Sparkles, User, ShoppingBag, ShieldCheck, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-lg bg-surface border border-primary flex items-center justify-center group-hover:shadow-neon-cyan transition-all duration-300">
            <Gamepad2 className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="font-cyber font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-purple to-secondary">
              WETRI<span className="text-secondary text-xs">.COM</span>
            </span>
            <span className="text-[10px] text-muted tracking-widest uppercase">Next-Gen Top-up</span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/catalog" className="text-slate-300 hover:text-primary transition-colors flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Katalog Game
          </Link>
          <Link href="/loyalty" className="text-slate-300 hover:text-secondary transition-colors flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-secondary" />
            Loyalti & Daily Streak
          </Link>
          <Link href="/check-transaction" className="text-slate-300 hover:text-primary transition-colors flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-accent-green" />
            Lacak Pesanan
          </Link>
        </nav>

        {/* Auth Action */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-surface border border-primary/30 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-primary/40 text-primary hover:bg-primary hover:text-black font-semibold text-xs transition-all duration-300"
              >
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt={user.displayName ?? ''} className="w-5 h-5 rounded-full" />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="hidden sm:inline max-w-[120px] truncate">{user.displayName ?? 'Dashboard'}</span>
              </Link>
              <button
                onClick={signOut}
                className="p-2 rounded-lg bg-surface border border-slate-700 text-slate-400 hover:text-secondary hover:border-secondary/50 transition-all"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-primary/40 text-primary hover:bg-primary hover:text-black font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-neon-cyan"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk / Daftar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
