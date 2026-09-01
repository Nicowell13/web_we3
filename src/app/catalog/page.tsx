import Link from 'next/link';

/**
 * Server‑side rendered product catalog.
 * Pulls active products from the backend API.
 */
export default async function CatalogPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/v1/products`, {
    cache: 'no-store',
  });
  const data = (await res.json()) as { ok: boolean; products: any[] };
  if (!data.ok) return <p>Failed to load catalog.</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Katalog Produk</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.products.map((p) => (
          <Link key={p.id} href={`/catalog/${p.id}`} className="glass-panel rounded-xl p-4 border border-surface-border hover:border-primary transition-colors">
            <div className="relative h-40 w-full mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbnailUrl} alt={p.name} className="object-cover w-full h-full rounded" />
            </div>
            <h2 className="font-cyber text-white text-sm mb-1 line-clamp-1">{p.name}</h2>
            <p className="text-xs text-slate-400">{p.gameName}</p>
            <p className="text-primary font-bold mt-2">Rp {p.sellPrice}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

