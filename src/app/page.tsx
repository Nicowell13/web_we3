import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api-url';
import {
  Zap,
  Sparkles,
  Shield,
  Trophy,
  ArrowRight,
  Gamepad2,
  Smartphone,
  Landmark,
  WalletCards,
  HelpCircle,
  Wifi,
  Ticket,
} from 'lucide-react';
import { getAllActiveProducts } from '../modules/product/product.service';
import QuickOrderWidget from '../components/home/QuickOrderWidget';

const FEATURED_GAMES = [
  {
    id: 'mobile-legends',
    name: 'Mobile Legends: Bang Bang',
    publisher: 'Moonton',
    category: 'Game',
    discountBadge: 'DISKON 15%',
    image: '/games/mobile-legends.png',
  },
  {
    id: 'free-fire',
    name: 'Free Fire MAX',
    publisher: 'Garena',
    category: 'Game',
    discountBadge: 'HOT PROMO',
    image: '/games/free-fire.png',
  },
  {
    id: 'magic-chess',
    name: 'Magic Chess Go Go',
    publisher: 'Moonton',
    category: 'Game',
    discountBadge: 'NEW',
    image: '/games/magic-chess.png',
  },
];

async function getHomeBanner() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/home-banner`, { cache: 'no-store' });
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

async function getFeaturedProducts() {
  try { return await getAllActiveProducts(); } catch { return []; }
}

export default async function HomePage() {
  const banner = await getHomeBanner();
  const allProducts = await getFeaturedProducts();
  const catalogSlice = allProducts.slice(0, 12);

  let rankings: { rank: number; avatarUrl: string | null; score: number }[] = [];
  try {
    rankings = (await fetch(`${getApiBaseUrl()}/api/v1/rankings/top-spenders`, { cache: 'no-store' }).then(res => res.json())).rankings ?? [];
  } catch {}

  const categories = [
    { icon: Gamepad2, label: 'Game', href: '/catalog?category=Game' },
    { icon: Smartphone, label: 'Pulsa', href: '/catalog?category=Pulsa' },
    { icon: Wifi, label: 'Data', href: '/catalog?category=Data' },
    { icon: Landmark, label: 'PLN', href: '/catalog?category=PLN' },
    { icon: WalletCards, label: 'E-Wallet', href: '/catalog?category=E-Wallet' },
    { icon: Ticket, label: 'Voucher', href: '/catalog?category=Voucher' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 sm:space-y-16">
      {/* Hero Section */}
      <section className="relative rounded-2xl glass-panel p-6 sm:p-12 border border-surface-border overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        {banner?.isActive && (banner.desktopImageUrl || banner.mobileImageUrl) && (
          <>
            {banner.desktopImageUrl && (
              <div className="absolute inset-y-0 right-0 hidden lg:block w-1/2 opacity-35">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.desktopImageUrl} alt="Desktop Promo Banner" className="h-full w-full object-cover" />
              </div>
            )}
            {(banner.mobileImageUrl || banner.desktopImageUrl) && (
              <div className="block lg:hidden w-full mb-4 rounded-xl overflow-hidden border border-surface-border max-h-48 relative z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.mobileImageUrl || banner.desktopImageUrl} alt="Mobile Promo Banner" className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}

        <div className="max-w-3xl space-y-4 sm:space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-primary/40 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
            Top-up & PPOB Kilat Otomatis
          </div>

          <h1 className="font-cyber text-2xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {banner?.isActive ? banner.title : 'TOP-UP INSTAN.'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-purple to-secondary">
              REWARD SETIAP TRANSAKSI.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl">
            {banner?.isActive ? banner.subtitle : 'Layanan top-up game & PPOB berkecepatan tinggi. Dapatkan cashback loyalty points, daily streak reward, dan diskon eksklusif.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={banner?.isActive ? banner.ctaUrl : '/catalog'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-black font-cyber font-bold text-xs sm:text-sm tracking-wide hover:shadow-neon-cyan transition-all duration-300 hover:scale-105"
            >
              <span>{banner?.isActive ? banner.ctaText : 'JELAJAHI KATALOG'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/loyalty"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface border border-secondary/50 text-secondary font-cyber font-bold text-xs sm:text-sm tracking-wide hover:shadow-neon-pink hover:bg-secondary/10 transition-all duration-300"
            >
              <Trophy className="w-4 h-4" />
              <span>KLAIM DAILY STREAK</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Quick Order Dialog / Widget (Main Homepage Focus) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cyber text-lg sm:text-2xl font-bold text-white tracking-wide">
              TRANSAKSI <span className="text-primary">KILAT</span>
            </h2>
            <p className="text-xs text-slate-400">Pilih operator / ID pelanggan, temukan nominal promo dan checkout instan.</p>
          </div>
        </div>
        <QuickOrderWidget products={allProducts} />
      </section>

      {/* Top Players Leaderboard */}
      <section className="glass-panel rounded-2xl p-6 border border-secondary/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-cyber text-lg sm:text-xl font-bold text-white">TOP SPENDER</h2>
            <p className="text-xs text-slate-400">Leaderboard transaksi berhasil bulan ini</p>
          </div>
          <Link href="/loyalty" className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
            Lihat Reward <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex items-end gap-3 sm:gap-4 h-36 mt-4">
          {rankings.map(item => (
            <div key={item.rank} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-secondary/20 rounded-t border-t border-secondary/40" style={{ height: `${Math.max(item.score, 12)}%` }} />
              <span className="text-xs font-cyber font-bold text-secondary">#{item.rank}</span>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary">
                {item.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Value Proposition Highlights: Placed right above footer */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-surface-border">
        <div className="glass-panel p-5 sm:p-6 rounded-xl border border-surface-border hover:border-primary/50 transition-all">
          <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-2.5" />
          <h3 className="font-cyber font-bold text-white text-sm sm:text-base mb-1">Pengiriman 3 Detik</h3>
          <p className="text-xs text-slate-400">Didukung integrasi multi-supplier otomatis dengan webhook real-time.</p>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-xl border border-surface-border hover:border-secondary/50 transition-all">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-secondary mb-2.5" />
          <h3 className="font-cyber font-bold text-white text-sm sm:text-base mb-1">Cashback & Loyalty</h3>
          <p className="text-xs text-slate-400">Kumpulkan poin tiap transaksi dan klaim voucher diskon eksklusif.</p>
        </div>

        <div className="glass-panel p-5 sm:p-6 rounded-xl border border-surface-border hover:border-accent-green/50 transition-all">
          <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-accent-green mb-2.5" />
          <h3 className="font-cyber font-bold text-white text-sm sm:text-base mb-1">100% Aman & Terpercaya</h3>
          <p className="text-xs text-slate-400">Pembayaran resmi berstandar DOKU Payment Gateway Idempotent.</p>
        </div>
      </section>
    </div>
  );
}
