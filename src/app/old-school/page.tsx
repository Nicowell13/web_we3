'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, RefreshCw, Terminal, Activity, Settings2, Database, LogIn } from 'lucide-react';

type AdminMetrics = {
  totalTransactions: number;
  totalSales: number;
  statusCounts: Record<string, number>;
};

type AuditLog = {
  id: string;
  eventType: string;
  referenceId: string | null;
  createdAt: string;
};

type SystemConfig = { id: string; key: string; value: string; description: string | null; isActive: boolean };
type AdminProduct = { id: string; denomination: string; basePrice: string; sellPrice: string; isActive: boolean; supplierStatus: string; gameId: string };
type AdminVoucher = {
  id: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: string;
  minPurchase: string;
  maxDiscount: string | null;
  quota: number;
  quotaUsed: number;
  pointsRequired: number;
  isPublic: boolean;
  isActive: boolean;
  expiresAt: string;
};
type AdminUser = { id: string; email: string; name: string | null; status: string; role: string; bannedReason: string | null };
type HomeBanner = {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  imageUrl: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  isActive: boolean;
};

export default function OldSchoolPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [accessState, setAccessState] = useState<'checking' | 'allowed' | 'forbidden' | 'unauthenticated'>('checking');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [actionMessage, setActionMessage] = useState('');
  const [banner, setBanner] = useState<HomeBanner | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<AdminVoucher | null>(null);
  const [showAddVoucher, setShowAddVoucher] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const verifyAndLoad = async () => {
    if (!user) {
      setAccessState('unauthenticated');
      return;
    }

    setLoadingData(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      const probe = await fetch(`${apiBase}/api/v1/old-school/ping`, { headers });
      if (probe.status === 401) {
        setAccessState('unauthenticated');
        return;
      }
      if (probe.status === 403) {
        setAccessState('forbidden');
        return;
      }
      if (!probe.ok) {
        setAccessState('forbidden');
        return;
      }

      setAccessState('allowed');

      const [mRes, lRes, cRes, pRes, vRes, uRes, bRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/old-school/metrics`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/audit-logs`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/configs`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/products`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/vouchers`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/users`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/banners`, { headers }),
      ]);

      if (mRes.ok) {
        const m = await mRes.json();
        setMetrics({
          totalTransactions: m.totalTransactions ?? 0,
          totalSales: m.totalSales ?? 0,
          statusCounts: m.statusCounts ?? {},
        });
      }
      if (lRes.ok) {
        const l = await lRes.json();
        setLogs(l.logs ?? []);
      }
      if (cRes.ok) { const c = await cRes.json(); setConfigs(c.configs ?? []); }
      if (pRes.ok) { const p = await pRes.json(); setProducts(p.products ?? []); }
      if (vRes.ok) { const v = await vRes.json(); setVouchers(v.vouchers ?? []); }
      if (uRes.ok) { const u = await uRes.json(); setUsers(u.users ?? []); }
      if (bRes.ok) { const b = await bRes.json(); setBanner(b.banner ?? null); }
    } catch {
      setAccessState('forbidden');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      verifyAndLoad();
    }
  }, [user, authLoading]);

  const adminAction = async (path: string, method: string, body?: unknown) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`${apiBase}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    setActionMessage(res.ok ? 'Perubahan tersimpan.' : 'Perubahan gagal.');
    if (res.ok) await verifyAndLoad();
  };

  const handleUpdateConfig = async (key: string, value: string) => {
    if (!user) return;
    setSavingKey(key);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${apiBase}/api/v1/old-school/configs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setConfigs(prev => prev.map(c => (c.key === key ? { ...c, value } : c)));
      }
    } finally {
      setSavingKey(null);
    }
  };

  if (authLoading || accessState === 'checking') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-slate-400">Verifying security perimeter...</p>
      </div>
    );
  }

  if (accessState === 'unauthenticated') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="glass-panel p-8 rounded-2xl border border-surface-border max-w-md w-full space-y-4">
          <Terminal className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-xl font-cyber font-bold text-white">Old School Portal</h1>
          <p className="text-xs text-slate-400">Autentikasi diperlukan untuk melanjutkan.</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-2.5 rounded-lg bg-primary text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white transition-colors shadow-neon-cyan"
          >
            <LogIn className="w-4 h-4" /> Masuk dengan Akun
          </button>
        </div>
      </div>
    );
  }

  if (accessState === 'forbidden') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <div className="p-4 rounded-2xl bg-surface border border-surface-border text-slate-500">
          <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto" />
        </div>
        <h1 className="text-3xl font-cyber font-bold text-slate-200">404</h1>
        <p className="text-sm text-slate-400 max-w-sm">Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.</p>
        <Link href="/" className="px-4 py-2 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 hover:text-white">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-2xl border border-primary/30 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-cyber font-bold text-white">Old School Control</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 uppercase">
              Root Level
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">Restricted operator zone • DB authority verified</p>
        </div>
        <button
          onClick={verifyAndLoad}
          disabled={loadingData}
          className="px-3 py-1.5 rounded-lg bg-surface border border-primary/40 text-primary hover:bg-primary hover:text-black text-xs font-semibold flex items-center gap-2 self-start md:self-auto transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-surface-border space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Transaksi</p>
          <p className="text-2xl font-cyber font-bold text-white">{metrics?.totalTransactions.toLocaleString('id-ID') ?? 0}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-primary/30 space-y-1">
          <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">Total Omset</p>
          <p className="text-2xl font-cyber font-bold text-primary">Rp {(metrics?.totalSales ?? 0).toLocaleString('id-ID')}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-accent-green/30 space-y-1">
          <p className="text-[10px] text-accent-green uppercase tracking-wider font-semibold">Transaksi Sukses</p>
          <p className="text-2xl font-cyber font-bold text-accent-green">{metrics?.statusCounts['SUCCESS'] ?? 0}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-secondary/30 space-y-1">
          <p className="text-[10px] text-secondary uppercase tracking-wider font-semibold">Transaksi Diproses / Pending</p>
          <p className="text-2xl font-cyber font-bold text-secondary">
            {(metrics?.statusCounts['PROCESSING'] ?? 0) + (metrics?.statusCounts['PENDING'] ?? 0) + (metrics?.statusCounts['PAID'] ?? 0)}
          </p>
        </div>
      </div>

      {actionMessage && <p className="text-xs text-primary font-mono">{actionMessage}</p>}

      {banner && <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
        <h2 className="text-base font-cyber font-bold text-white">Home Banner Promo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input id="banner-title" defaultValue={banner.title} className="bg-black/40 border border-surface-border rounded px-3 py-2 text-xs text-white" placeholder="Title" />
          <input id="banner-cta" defaultValue={banner.ctaText} className="bg-black/40 border border-surface-border rounded px-3 py-2 text-xs text-white" placeholder="CTA text" />
          <input id="banner-url" defaultValue={banner.ctaUrl} className="bg-black/40 border border-surface-border rounded px-3 py-2 text-xs text-white" placeholder="CTA URL" />
          <label className="flex items-center gap-2 text-xs text-slate-300"><input id="banner-active" type="checkbox" defaultChecked={banner.isActive} /> Active</label>
          <textarea id="banner-subtitle" defaultValue={banner.subtitle} className="md:col-span-2 bg-black/40 border border-surface-border rounded px-3 py-2 text-xs text-white" placeholder="Subtitle" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">Desktop Banner (1200px)</p>
            {banner.desktopImageUrl ? (
              <img src={banner.desktopImageUrl} alt="Desktop banner" className="max-h-36 w-full rounded-lg object-cover border border-surface-border" />
            ) : (
              <p className="text-[11px] text-slate-500 italic">Belum ada banner desktop.</p>
            )}
            <input
              id="banner-image-desktop"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-xs text-slate-300 block w-full"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => adminAction('/api/v1/old-school/banners/image', 'POST', { image: reader.result, variant: 'desktop' });
                reader.readAsDataURL(file);
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">Mobile Banner (720px)</p>
            {banner.mobileImageUrl ? (
              <img src={banner.mobileImageUrl} alt="Mobile banner" className="max-h-36 w-full rounded-lg object-cover border border-surface-border" />
            ) : (
              <p className="text-[11px] text-slate-500 italic">Belum ada banner mobile.</p>
            )}
            <input
              id="banner-image-mobile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-xs text-slate-300 block w-full"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => adminAction('/api/v1/old-school/banners/image', 'POST', { image: reader.result, variant: 'mobile' });
                reader.readAsDataURL(file);
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => adminAction('/api/v1/old-school/banners', 'POST', { title: (document.getElementById('banner-title') as HTMLInputElement).value, subtitle: (document.getElementById('banner-subtitle') as HTMLTextAreaElement).value, ctaText: (document.getElementById('banner-cta') as HTMLInputElement).value, ctaUrl: (document.getElementById('banner-url') as HTMLInputElement).value, isActive: (document.getElementById('banner-active') as HTMLInputElement).checked })} className="px-3 py-2 rounded bg-primary/20 border border-primary/40 text-primary text-xs">Save Banner Text</button>
        </div>
      </div>}

      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
        <h2 className="text-base font-cyber font-bold text-white">Products & Digiflazz</h2>
        <button onClick={() => adminAction('/api/v1/old-school/suppliers/digiflazz/sync-products', 'POST')} className="px-3 py-2 rounded bg-primary/20 border border-primary/40 text-primary text-xs">Sync Digiflazz</button>
        <div className="space-y-2 max-h-80 overflow-y-auto">{products.map(p => <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded bg-surface text-xs"><span>{p.gameId} / {p.denomination}</span><span>Rp {Number(p.sellPrice).toLocaleString('id-ID')}</span><button onClick={() => adminAction(`/api/v1/old-school/products/${p.id}`, 'PATCH', { isActive: !p.isActive })} className="text-primary">{p.isActive ? 'Disable' : 'Enable'}</button></div>)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-cyber font-bold text-white">Vouchers Management</h2>
            <button
              onClick={() => { setShowAddVoucher(!showAddVoucher); setEditingVoucher(null); }}
              className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-black text-xs font-semibold"
            >
              {showAddVoucher ? 'Tutup Form' : '+ Add Voucher'}
            </button>
          </div>

          {/* Form Add Voucher */}
          {showAddVoucher && (
            <div className="p-4 rounded-xl bg-surface border border-primary/40 space-y-3">
              <h3 className="text-xs font-cyber font-bold text-primary uppercase">Buat Voucher Baru</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <input id="v-code" placeholder="Kode (e.g. PROMO50)" className="bg-black/40 border border-surface-border rounded p-2 text-white uppercase font-mono" />
                <select id="v-type" className="bg-black/40 border border-surface-border rounded p-2 text-white">
                  <option value="fixed">Fixed (Nominal Rp)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <input id="v-value" type="number" placeholder="Nilai Diskon (e.g. 10000 atau 10)" className="bg-black/40 border border-surface-border rounded p-2 text-white" />
                <input id="v-min" type="number" placeholder="Min Transaksi (e.g. 50000)" className="bg-black/40 border border-surface-border rounded p-2 text-white" />
                <input id="v-max" type="number" placeholder="Max Diskon (opsional)" className="bg-black/40 border border-surface-border rounded p-2 text-white" />
                <input id="v-quota" type="number" placeholder="Quota (e.g. 100)" defaultValue={100} className="bg-black/40 border border-surface-border rounded p-2 text-white" />
                <input id="v-points" type="number" placeholder="Points Required (e.g. 0)" defaultValue={0} className="bg-black/40 border border-surface-border rounded p-2 text-white" />
                <input id="v-expires" type="datetime-local" className="bg-black/40 border border-surface-border rounded p-2 text-white" />
              </div>
              <button
                onClick={async () => {
                  const code = (document.getElementById('v-code') as HTMLInputElement)?.value;
                  const discountType = (document.getElementById('v-type') as HTMLSelectElement)?.value;
                  const discountValue = (document.getElementById('v-value') as HTMLInputElement)?.value;
                  const minPurchase = (document.getElementById('v-min') as HTMLInputElement)?.value || '0';
                  const maxDiscount = (document.getElementById('v-max') as HTMLInputElement)?.value || null;
                  const quota = (document.getElementById('v-quota') as HTMLInputElement)?.value || '100';
                  const pointsRequired = (document.getElementById('v-points') as HTMLInputElement)?.value || '0';
                  const expiresAt = (document.getElementById('v-expires') as HTMLInputElement)?.value;

                  if (!code || !discountValue || !expiresAt) {
                    setActionMessage('Kode, Nilai Diskon, dan Expired Date wajib diisi.');
                    return;
                  }

                  await adminAction('/api/v1/old-school/vouchers', 'POST', {
                    code: code.toUpperCase(),
                    discountType,
                    discountValue,
                    minPurchase,
                    maxDiscount,
                    quota: Number(quota),
                    pointsRequired: Number(pointsRequired),
                    expiresAt: new Date(expiresAt).toISOString(),
                    isActive: true,
                    isPublic: true,
                  });
                  setShowAddVoucher(false);
                }}
                className="w-full py-2 rounded bg-primary text-black font-cyber font-bold text-xs hover:bg-white transition-colors"
              >
                Simpan & Rilis Voucher
              </button>
            </div>
          )}

          {/* Form Edit / Settings Voucher */}
          {editingVoucher && (
            <div className="p-4 rounded-xl bg-surface border border-secondary/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-cyber font-bold text-secondary uppercase">Setting Voucher: {editingVoucher.code}</h3>
                <button onClick={() => setEditingVoucher(null)} className="text-xs text-slate-400 hover:text-white">Batal</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400">Nilai Diskon</label>
                  <input id="ve-value" type="number" defaultValue={editingVoucher.discountValue} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Quota Total</label>
                  <input id="ve-quota" type="number" defaultValue={editingVoucher.quota} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Min Transaksi</label>
                  <input id="ve-min" type="number" defaultValue={editingVoucher.minPurchase} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Max Diskon</label>
                  <input id="ve-max" type="number" defaultValue={editingVoucher.maxDiscount ?? ''} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const discountValue = (document.getElementById('ve-value') as HTMLInputElement)?.value;
                    const quota = (document.getElementById('ve-quota') as HTMLInputElement)?.value;
                    const minPurchase = (document.getElementById('ve-min') as HTMLInputElement)?.value;
                    const maxDiscount = (document.getElementById('ve-max') as HTMLInputElement)?.value || null;

                    await adminAction(`/api/v1/old-school/vouchers/${editingVoucher.id}`, 'PATCH', {
                      discountValue,
                      quota: Number(quota),
                      minPurchase,
                      maxDiscount,
                    });
                    setEditingVoucher(null);
                  }}
                  className="flex-1 py-1.5 rounded bg-secondary/20 border border-secondary/40 text-secondary text-xs font-semibold hover:bg-secondary hover:text-black"
                >
                  Simpan Setting
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Kill voucher ${editingVoucher.code} sekarang?`)) {
                      await adminAction(`/api/v1/old-school/vouchers/${editingVoucher.id}`, 'PATCH', { isActive: false });
                      setEditingVoucher(null);
                    }
                  }}
                  className="px-3 py-1.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white text-xs font-semibold"
                >
                  Kill Voucher
                </button>
              </div>
            </div>
          )}

          {/* List Vouchers */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {vouchers.map(v => {
              const isExpired = new Date(v.expiresAt) <= new Date();
              return (
                <div key={v.id} className="p-2.5 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{v.code}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${v.isActive && !isExpired ? 'bg-accent-green/20 text-accent-green border border-accent-green/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                        {!v.isActive ? 'KILLED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Diskon: {v.discountValue} {v.discountType === 'percentage' ? '%' : 'Rp'} • Quota: {v.quotaUsed}/{v.quota}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => { setEditingVoucher(v); setShowAddVoucher(false); }}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
                    >
                      Setting
                    </button>
                    {v.isActive ? (
                      <button
                        onClick={() => adminAction(`/api/v1/old-school/vouchers/${v.id}`, 'PATCH', { isActive: false })}
                        className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[11px]"
                      >
                        Kill
                      </button>
                    ) : (
                      <button
                        onClick={() => adminAction(`/api/v1/old-school/vouchers/${v.id}`, 'PATCH', { isActive: true })}
                        className="px-2 py-1 rounded bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-black text-[11px]"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <h2 className="text-base font-cyber font-bold text-white">Users</h2>
          {users.map(u => <div key={u.id} className="flex items-center justify-between p-2 rounded bg-surface text-xs"><span>{u.name || u.email} · {u.status}</span><button onClick={() => adminAction(`/api/v1/old-school/users/${u.id}/status`, 'POST', { status: u.status === 'banned' ? 'active' : 'banned', reason: 'Admin action' })} className="text-primary">{u.status === 'banned' ? 'Unban' : 'Ban'}</button></div>)}
        </div>

        {/* System Configs */}
        <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <h2 className="text-base font-cyber font-bold text-white">System Configs</h2>
          </div>
          {configs.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">Belum ada config tersimpan.</p>
          ) : (
            <div className="space-y-3">
              {configs.map(cfg => (
                <div key={cfg.key} className="p-3 rounded-lg bg-surface border border-surface-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-200">{cfg.key}</span>
                    <span className="text-[10px] text-slate-500">{cfg.description ?? ''}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      defaultValue={cfg.value}
                      id={`cfg-${cfg.key}`}
                      className="flex-1 bg-black/40 border border-surface-border rounded px-2.5 py-1 text-xs text-white font-mono focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`cfg-${cfg.key}`) as HTMLInputElement | null;
                        if (input) handleUpdateConfig(cfg.key, input.value);
                      }}
                      disabled={savingKey === cfg.key}
                      className="px-3 py-1 rounded bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-black text-xs font-semibold"
                    >
                      {savingKey === cfg.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Logs */}
        <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-green" />
            <h2 className="text-base font-cyber font-bold text-white">Audit Trail Terbaru</h2>
          </div>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">Belum ada log aktivitas.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {logs.map(l => (
                <div key={l.id} className="p-2.5 rounded-lg bg-surface border border-surface-border flex items-center justify-between text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-primary font-bold">{l.eventType}</span>
                    <p className="text-[10px] text-slate-400">Ref: {l.referenceId ?? '-'}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(l.createdAt).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
