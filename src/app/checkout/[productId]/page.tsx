"use client";

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Checkout page – displays selected product and dynamic input fields.
 * Calls `/api/v1/payment/create-link` to obtain a payment URL.
 */
export default function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const idempotencyKey = useRef<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetId, setTargetId] = useState('');
  const [serverId, setServerId] = useState('');
  const [voucher, setVoucher] = useState('');
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load product data on mount
  useEffect(() => {
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/product/${productId}`);
      const data = await res.json();
      if (data.ok) setProduct(data.product);
      setLoading(false);
    })();
  }, [productId]);

  if (loading) return <p className="text-white">Loading…</p>;
  if (!product) return <p className="text-white">Product not found.</p>;

  const estimatedPoints = Math.floor(Number(product.sellPrice) / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      if (!user) throw new Error('Login diperlukan untuk checkout.');
      idempotencyKey.current ??= crypto.randomUUID();
      const token = await user.getIdToken();
      const payload = {
        productId: product.id,
        targetUserId: targetId,
        targetServerId: serverId || undefined,
        voucherCode: voucher || undefined,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/payment/create-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey.current,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Checkout gagal.');
      setResult(json);
    } catch (error) {
      setResult({ message: error instanceof Error ? error.message : 'Checkout gagal.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 glass-panel border border-surface-border">
      <h1 className="text-2xl font-cyber font-bold text-white mb-4">Checkout – {product.name}</h1>
      <div className="p-4 rounded-xl bg-surface border border-surface-border mb-4"><p className="text-xs text-slate-400">Nominal</p><p className="text-white font-semibold">{product.name}</p><p className="text-primary font-bold text-lg mt-2">Total: Rp {Number(product.sellPrice).toLocaleString('id-ID')}</p></div>
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
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-primary text-black rounded hover:bg-primary/80 transition disabled:opacity-50">
          {submitting ? 'Memproses...' : 'Lanjutkan Pembayaran'}
        </button>
      </form>
      {result && (
        <pre className="mt-4 p-2 bg-surface rounded text-white overflow-x-auto">
          {result.invoiceUrl ? <a className="text-primary underline" href={result.invoiceUrl}>Buka halaman pembayaran</a> : result.message || 'Transaksi belum dapat diproses.'}
        </pre>
      )}
      <button onClick={() => router.push('/catalog')} className="mt-4 text-primary hover:underline">
        &larr; Kembali ke Katalog
      </button>
    </div>
  );
}
