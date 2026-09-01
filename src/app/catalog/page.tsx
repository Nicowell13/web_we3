"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

/**
 * Server‑side rendered catalog with category filter.
 */
export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>('All');

  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/v1/products`, {
        cache: 'no-store',
      });
      const data = (await res.json()) as { ok: boolean; products: any[] };
      if (data.ok) setProducts(data.products);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-white">Loading catalog…</p>;

  const categories = ['All', ...new Set(products.map(p => p.gameCategory))];
  const filtered = products.filter(p => cat === 'All' || p.gameCategory === cat);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-white">Katalog Produk</h1>
      <div className="flex gap-2 mb-6">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1 rounded ${c === cat ? 'bg-primary text-black' : 'bg-surface text-slate-400'} hover:bg-primary/70 transition`}
          >{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filtered.map(p => (
          <Link
            key={p.id}
            href={`/catalog/${p.id}`}
            className="glass-panel rounded-xl p-4 border border-surface-border hover:border-primary transition-colors shadow-neon-cyan"
          >
            <div className="relative h-40 w-full mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnailUrl} alt={p.name} className="object-cover w-full h-full rounded" />
            </div>
            <h2 className="font-cyber text-white text-sm mb-1 line-clamp-1">{p.name}</h2>
            <p className="text-xs text-slate-400">{p.gameCategory}</p>
            <p className="text-primary font-bold mt-2">Rp {p.sellPrice}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
