import Link from 'next/link';
import { Zap, Sparkles, Shield, Trophy, ArrowRight } from 'lucide-react';

const FEATURED_GAMES = [
  {
    id: 'mobile-legends',
    name: 'Mobile Legends: Bang Bang',
    publisher: 'Moonton',
    category: 'MOBA',
    discountBadge: 'DISKON 15%',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'free-fire',
    name: 'Free Fire MAX',
    publisher: 'Garena',
    category: 'Battle Royale',
    discountBadge: 'HOT PROMO',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'genshin-impact',
    name: 'Genshin Impact',
    publisher: 'HoYoverse',
    category: 'RPG',
    discountBadge: 'BONUS POIN 2X',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'valorant',
    name: 'Valorant Points',
    publisher: 'Riot Games',
    category: 'FPS',
    discountBadge: 'INSTANT DROP',
    image: 'https://images.unsplash.com/photo-1552824796-0300445d4c8e?w=600&auto=format&fit=crop&q=80',
  },
];

async function getHomeBanner() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/home-banner`, { cache: 'no-store' });
    if (!res.ok) throw new Error('banner unavailable');
    return (await res.json()).banner as {
      title: string;
      subtitle: string;
      ctaText: string;
      ctaUrl: string;
      imageUrl: string;
      desktopImageUrl: string;
      mobileImageUrl: string;
      isActive: boolean;
    };
  } catch { return null; }
}

export default async function HomePage() {
  const banner = await getHomeBanner();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-2xl glass-panel p-8 sm:p-12 border border-surface-border overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        {banner?.isActive && (banner.desktopImageUrl || banner.mobileImageUrl) && (
          <>
            {/* Desktop promo image */}
            {banner.desktopImageUrl && (
              <div className="absolute inset-y-0 right-0 hidden lg:block w-1/2 opacity-35">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.desktopImageUrl} alt="Desktop Promo Banner" className="h-full w-full object-cover" />
              </div>
            )}
            {/* Mobile/Tablet promo image */}
            {(banner.mobileImageUrl || banner.desktopImageUrl) && (
              <div className="block lg:hidden w-full mb-4 rounded-xl overflow-hidden border border-surface-border max-h-48 relative z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.mobileImageUrl || banner.desktopImageUrl} alt="Mobile Promo Banner" className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}
        <div className="max-w-3xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-primary/40 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
             Top-up Destination Terpercaya
          </div>

          <h1 className="font-cyber text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {banner?.isActive ? banner.title : 'LEVEL UP INSTAN.'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-purple to-secondary">
              REWARD SETIAP TRANSAKSI.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-xl">
            {banner?.isActive ? banner.subtitle : 'Layanan top-up game & PPOB tercepat berkecepatan kilat. Dapatkan cashback loyalty points, daily streak reward, dan promo diskon eksklusif.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={banner?.isActive ? banner.ctaUrl : '/catalog'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-black font-cyber font-bold text-sm tracking-wide hover:shadow-neon-cyan transition-all duration-300 hover:scale-105"
            >
              <span>{banner?.isActive ? banner.ctaText : 'JELAJAHI KATALOG'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/loyalty"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface border border-secondary/50 text-secondary font-cyber font-bold text-sm tracking-wide hover:shadow-neon-pink hover:bg-secondary/10 transition-all duration-300"
            >
              <Trophy className="w-4 h-4" />
              <span>KLAIM DAILY STREAK</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl border border-surface-border hover:border-primary/50 transition-all">
          <Zap className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-cyber font-bold text-white text-base mb-1">Pengiriman 3 Detik</h3>
          <p className="text-xs text-slate-400">Didukung arsitektur multi-supplier otomatis tanpa jeda manual.</p>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-surface-border hover:border-secondary/50 transition-all">
          <Sparkles className="w-8 h-8 text-secondary mb-3" />
          <h3 className="font-cyber font-bold text-white text-base mb-1">Cashback & Gamifikasi</h3>
          <p className="text-xs text-slate-400">Kumpulkan poin tiap transaksi dan bonus 5-day daily checkin.</p>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-surface-border hover:border-accent-green/50 transition-all">
          <Shield className="w-8 h-8 text-accent-green mb-3" />
          <h3 className="font-cyber font-bold text-white text-base mb-1">Garansi 100% Legal</h3>
          <p className="text-xs text-slate-400">Pembayaran resmi berstandar DOKU Payment Gateway Idempotent.</p>
        </div>
      </section>

      {/* Featured Catalog Cards */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cyber text-xl sm:text-2xl font-bold text-white tracking-wide">
              PRODUK POPULER <span className="text-primary">#TRENDING</span>
            </h2>
            <p className="text-xs text-slate-400">Pilihan game terfavorit dengan harga termurah hari ini.</p>
          </div>
          <Link href="/catalog" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_GAMES.map((game) => (
            <Link
              key={game.id}
              href={`/catalog/${game.id}`}
              className="group glass-panel rounded-xl border border-surface-border overflow-hidden hover:border-primary transition-all duration-300 hover:shadow-neon-cyan flex flex-col"
            >
              <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/70 backdrop-blur border border-secondary text-secondary text-[10px] font-cyber font-bold shadow-neon-pink">
                  {game.discountBadge}
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] text-slate-300">
                  {game.category}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <p className="text-[11px] text-muted">{game.publisher}</p>
                  <h3 className="font-cyber font-semibold text-white text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {game.name}
                  </h3>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Mulai</span>
                  <span className="text-primary font-cyber font-bold">Rp 1.000</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
