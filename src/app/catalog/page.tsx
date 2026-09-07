'use client';

import { getApiBaseUrl } from '@/lib/api-url';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, PackageX, Sparkles, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  'Semua',
  'Game',
  'Pulsa',
  'Data',
  'PLN',
  'E-Wallet',
  'Voucher',
];

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategoryParam = searchParams.get('category') || 'Semua';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected category normalized to title case
  const activeCategory = CATEGORIES.find(
    (c) => c.toLowerCase() === currentCategoryParam.toLowerCase()
  ) || 'Semua';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${getApiBaseUrl()}/api/v1/products`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = (await res.json()) as { ok: boolean; products: any[] };
          if (data.ok && Array.isArray(data.products)) {
            setProducts(data.products);
          }
        }
      } catch (e) {
        console.error('Failed to load products', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCategoryChange = (category: string) => {
    if (category === 'Semua') {
      router.push('/catalog');
    } else {
      router.push(`/catalog?category=${encodeURIComponent(category)}`);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === 'Semua' ||
      (p.gameCategory || '').toLowerCase() === activeCategory.toLowerCase();

    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (p.name || '').toLowerCase().includes(query) ||
      (p.gameName || '').toLowerCase().includes(query) ||
      (p.denomination || '').toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              Official Marketplace
            </span>
          </div>
          <h1 className="text-3xl font-cyber font-bold text-white tracking-wide">
            Katalog Produk & Layanan
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pilih kategori dan nominal yang kamu butuhkan. Pengiriman instan otomatis 24/7.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari game, pulsa, nominal..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-surface-border text-white text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-cyber font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-black shadow-neon-cyan'
                  : 'bg-surface border border-surface-border text-slate-300 hover:border-primary/50 hover:text-white'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Content Grid / Loading / Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-8">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="glass-panel p-4 rounded-2xl border border-surface-border animate-pulse space-y-3"
            >
              <div className="h-36 bg-surface rounded-xl" />
              <div className="h-4 bg-surface rounded w-3/4" />
              <div className="h-3 bg-surface rounded w-1/2" />
              <div className="h-5 bg-surface rounded w-1/3 pt-2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <Link
              key={p.id}
              href={`/checkout/${p.id}`}
              className="glass-panel rounded-2xl p-4 border border-surface-border hover:border-primary hover:shadow-neon-cyan transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 w-full mb-3 rounded-xl overflow-hidden bg-black/40 border border-surface-border flex items-center justify-center">
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt={p.name || p.gameName}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-xs font-mono text-slate-500">No Image</span>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/70 text-primary border border-primary/30 backdrop-blur-sm">
                    {p.gameCategory || 'TopUp'}
                  </span>
                </div>

                <h2 className="font-cyber font-bold text-white text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                  {p.name || p.denomination}
                </h2>
                <p className="text-xs text-slate-400 font-mono mb-2">
                  {p.gameName || p.category}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-border/50 mt-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Harga</span>
                  <p className="text-primary font-mono font-bold text-sm">
                    Rp {Number(p.sellPrice).toLocaleString('id-ID')}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] font-cyber font-bold group-hover:bg-primary group-hover:text-black transition-all">
                  BELI →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State UI */
        <div className="glass-panel p-12 rounded-2xl border border-surface-border text-center flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-12">
          <div className="p-4 rounded-2xl bg-surface border border-surface-border text-primary">
            <PackageX className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-cyber font-bold text-white">
              Belum Ada Produk Tersedia
            </h2>
            <p className="text-xs text-slate-400 max-w-sm">
              Produk untuk kategori <strong className="text-primary font-mono">{activeCategory}</strong> sedang dalam proses penyiapan. Silakan cek kategori lainnya.
            </p>
          </div>
          <button
            onClick={() => {
              setSearch('');
              handleCategoryChange('Semua');
            }}
            className="px-5 py-2 rounded-xl bg-primary text-black font-cyber font-bold text-xs hover:bg-white transition-all flex items-center gap-2 shadow-neon-cyan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Lihat Semua Produk
          </button>
        </div>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 font-mono text-sm">
          Memuat katalog WETRI...
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
