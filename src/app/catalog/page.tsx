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
  const [group, setGroup] = useState<string>('All');
  const [search, setSearch] = useState('');

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
  const groups = ['All', ...new Set(products.filter(p => cat === 'All' || p.gameCategory === cat).map(p => p.gameName))];
  const filtered = products.filter(p => (cat === 'All' || p.gameCategory === cat) && (group === 'All' || p.gameName === group) && `${p.name} ${p.gameName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h1 className="text-3xl font-bold text-white">Katalog Produk</h1><p className="text-sm text-slate-400 mt-1">Pilih game, nominal, lalu top up dalam hitungan detik.</p></div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari game atau nominal..." className="w-full sm:w-64 px-3 py-2 rounded bg-surface border border-surface-border text-white text-sm" /></div>
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1 rounded ${c === cat ? 'bg-primary text-black' : 'bg-surface text-slate-400'} hover:bg-primary/70 transition`}
          >{c}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto">{groups.map(g => <button key={g} onClick={() => setGroup(g)} className={`px-3 py-1 rounded text-xs ${g === group ? 'bg-secondary text-black' : 'bg-surface text-slate-400'}`}>{g}</button>)}</div>
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
            <div className="flex items-center justify-between mt-2"><p className="text-primary font-bold">Rp {Number(p.sellPrice).toLocaleString('id-ID')}</p><span className="text-[10px] text-secondary">TOP UP →</span></div>
          </Link>
        ))}
      </div>
      {!filtered.length && <p className="text-slate-400 text-sm">Produk tidak tersedia di kategori ini.</p>}
    </div>
  );
}
