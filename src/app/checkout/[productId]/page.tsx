'use client';

import { use, useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Shield, ArrowRight, Lock, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';

function CheckoutContent({ productId }: { productId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const idempotencyKey = useRef<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const paramTargetId = searchParams.get('targetId') || searchParams.get('phone') || '';
  const paramServerId = searchParams.get('serverId') || '';
  
  const [targetId, setTargetId] = useState(paramTargetId);
  const [serverId, setServerId] = useState(paramServerId);
  const [voucher, setVoucher] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync state if query params change
  useEffect(() => {
    if (paramTargetId && !targetId) setTargetId(paramTargetId);
    if (paramServerId && !serverId) setServerId(paramServerId);
  }, [paramTargetId, paramServerId, targetId, serverId]);

  // Load product data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/product/${productId}`);
        const data = await res.json();
        if (data.ok) setProduct(data.product);
        else setError(data.message || 'Produk tidak ditemukan.');
      } catch (err: any) {
        setError('Gagal memuat detail produk.');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  if (loading || authLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-300 text-sm">Menyiapkan checkout WETRI...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center glass-panel rounded-2xl border border-surface-border">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-cyber font-bold text-white mb-1">Produk Tidak Ditemukan</h2>
        <p className="text-xs text-slate-400 mb-6">{error || 'Produk tidak aktif atau ID salah.'}</p>
        <Link href="/catalog" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-black font-semibold text-xs">
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>
    );
  }

  const estimatedPoints = Math.floor(Number(product.sellPrice) / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Smart Auth Gate: If user not logged in, redirect to login with current checkout context
    if (!user) {
      const currentQuery = new URLSearchParams({
        ...(targetId ? { targetId } : {}),
        ...(serverId ? { serverId } : {}),
      }).toString();
      const returnCheckoutUrl = `/checkout/${product.id}${currentQuery ? `?${currentQuery}` : ''}`;
      router.push(`/login?redirect=${encodeURIComponent(returnCheckoutUrl)}`);
      return;
    }

    if (!targetId.trim()) {
      setError('Target ID / Nomor Tujuan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      idempotencyKey.current ??= crypto.randomUUID();
      const token = await user.getIdToken();
      const payload = {
        productId: product.id,
        targetUserId: targetId.trim(),
        targetServerId: serverId.trim() || undefined,
        voucherCode: voucher.trim() || undefined,
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
      if (!res.ok) {
        throw new Error(json.message || 'Checkout gagal.');
      }

      // If DOKU invoice URL is provided, redirect to DOKU Sandbox payment
      if (json.invoiceUrl || json.paymentUrl) {
        window.location.href = json.invoiceUrl || json.paymentUrl;
      } else {
        // Fallback: If free or direct success, redirect to dashboard
        router.push('/dashboard?payment=success');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memproses pembayaran.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/catalog" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        <span>Kembali ke Katalog</span>
      </Link>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-surface-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-surface-border pb-5 mb-6">
          <div>
            <span className="text-[11px] text-primary font-semibold uppercase tracking-wider">Checkout Resmi</span>
            <h1 className="text-xl sm:text-2xl font-cyber font-bold text-white mt-0.5">{product.name}</h1>
          </div>
          <div className="px-3 py-1 rounded-full bg-surface border border-primary/40 text-primary text-xs font-cyber font-bold">
            {product.gameCategory || 'TOP-UP'}
          </div>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-black/40 border border-surface-border">
            <span className="text-[11px] text-slate-400 block mb-1">Total Pembayaran</span>
            <span className="text-xl font-cyber font-bold text-primary">
              Rp {Number(product.sellPrice).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-surface-border flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Estimasi Cashback</span>
              <span className="text-sm font-semibold text-secondary flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> +{estimatedPoints} Loyalty Points
              </span>
            </div>
            <Shield className="w-6 h-6 text-emerald-400/60" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target ID / Nomor Tujuan <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Contoh: 089612345678 atau User ID Game"
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Zone / Server ID <span className="text-slate-500">(Opsional untuk game tertentu)</span>
            </label>
            <input
              type="text"
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              placeholder="Contoh: ID atau 2024"
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Kode Voucher / Promo <span className="text-slate-500">(Opsional)</span>
            </label>
            <input
              type="text"
              value={voucher}
              onChange={(e) => setVoucher(e.target.value)}
              placeholder="Masukkan kode voucher diskon"
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono uppercase"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-primary text-black font-cyber font-bold text-sm tracking-wide hover:shadow-neon-cyan transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>MENGHUBUNGKAN DOKU...</span>
                </>
              ) : !user ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>MASUK & LANJUT PEMBAYARAN</span>
                </>
              ) : (
                <>
                  <span>BAYAR SEKARANG</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> DOKU Sandbox Gateway Terlindungi
          </span>
          <span>Instan 3 Detik</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto py-16 px-4 text-center text-slate-400 text-sm">Memuat checkout...</div>}>
      <CheckoutContent productId={productId} />
    </Suspense>
  );
}
