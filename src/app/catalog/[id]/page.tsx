import { notFound } from 'next/navigation';

/**
 * Product detail page – fetches a single product by ID.
 * Uses same backend API (`/api/v1/product/:id`).
 */
export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/v1/product/${id}`, {
    cache: 'no-store',
  });
  const data = (await res.json()) as { ok: boolean; product?: any; message?: string };

  if (!data.ok || !data.product) notFound();

  const p = data.product;
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-cyber font-bold text-white mb-4">{p.name}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.thumbnailUrl} alt={p.name} className="w-full h-64 object-cover rounded mb-4" />
      <p className="text-slate-300 mb-2">Game: {p.gameName}</p>
      <p className="text-primary font-bold text-lg">Harga: Rp {p.sellPrice}</p>
      <p className="mt-4">{p.denomination}</p>
    </div>
  );
}
