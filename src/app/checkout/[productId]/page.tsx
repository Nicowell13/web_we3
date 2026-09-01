"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Checkout page – displays selected product and dynamic input fields.
 * Calls `/api/v1/payment/create-link` to obtain a payment URL.
 */
export default function CheckoutPage({ params }: { params: { productId: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetId, setTargetId] = useState('');
  const [serverId, setServerId] = useState('');
  const [voucher, setVoucher] = useState('');
  const [result, setResult] = useState<any>(null);

  // Load product data on mount
  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/v1/product/${params.productId}`);
      const data = await res.json();
      if (data.ok) setProduct(data.product);
      setLoading(false);
    })();
  }, [params.productId]);

  if (loading) return <p className="text-white">Loading…</p>;
  if (!product) return <p className="text-white">Product not found.</p>;

  const estimatedPoints = Math.floor(Number(product.sellPrice) / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    const payload = {
      orderId: `${Date.now()}_${product.id}`,
      amount: product.sellPrice,
      targetUserId: targetId,
      targetServerId: serverId || undefined,
      voucherCode: voucher || undefined,
    };
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/v1/payment/create-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setResult(json);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 glass-panel border border-surface-border">
      <h1 className="text-2xl font-cyber font-bold text-white mb-4">Checkout – {product.name}</h1>
      <p className="text-slate-300 mb-2">Harga: Rp {product.sellPrice}</p>
      <p className="text-slate-300 mb-2">Estimasi poin: {estimatedPoints}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-400 mb-1">Target ID (user / game ID)</label>
          <input
            required
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface text-white"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Server ID (optional)</label>
          <input
            value={serverId}
            onChange={e => setServerId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface text-white"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Voucher code</label>
          <input
            value={voucher}
            onChange={e => setVoucher(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface text-white"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary text-black rounded hover:bg-primary/80 transition">
          Buat Payment Link
        </button>
      </form>
      {result && (
        <pre className="mt-4 p-2 bg-surface rounded text-white overflow-x-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      <button onClick={() => router.push('/catalog')} className="mt-4 text-primary hover:underline">
        &larr; Kembali ke Katalog
      </button>
    </div>
  );
}

