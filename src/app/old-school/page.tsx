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
  voucherType?: 'new_user' | 'promo' | 'loyalty_points';
  discountType: 'fixed' | 'percentage';
  discountValue: string;
  minPurchase: string;
  maxDiscount: string | null;
  quota: number;
  quotaUsed: number;
  dailyLimit?: number | null;
  pointsRequired: number;
  isPublic: boolean;
  isActive: boolean;
  startAt?: string;
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
  const [createVoucherType, setCreateVoucherType] = useState<'new_user' | 'promo' | 'loyalty_points'>('promo');

  // Helper date states for Create Voucher
  const now = new Date();
  const [startDay, setStartDay] = useState(now.getDate());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startHour, setStartHour] = useState(now.getHours());
  const [startMinute, setStartMinute] = useState(0);

  const defaultExp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [expDay, setExpDay] = useState(defaultExp.getDate());
  const [expMonth, setExpMonth] = useState(defaultExp.getMonth() + 1);
  const [expYear, setExpYear] = useState(defaultExp.getFullYear());
  const [expHour, setExpHour] = useState(23);
  const [expMinute, setExpMinute] = useState(59);

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
        <div className="flex items-center justify-between">
          <h2 className="text-base font-cyber font-bold text-white">Products & Digiflazz</h2>
          <button onClick={() => adminAction('/api/v1/old-school/suppliers/digiflazz/sync-products', 'POST')} className="px-3 py-1.5 rounded bg-primary/20 border border-primary/40 text-primary text-xs font-semibold hover:bg-primary hover:text-black">
            Sync Digiflazz
          </button>
        </div>
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface border border-surface-border text-xs">
              <div className="space-y-0.5">
                <span className="font-mono text-white font-semibold">{p.gameId} / {p.denomination}</span>
                <p className="text-[10px] text-slate-400">Modal: Rp {Number(p.basePrice).toLocaleString('id-ID')} • Jual: Rp {Number(p.sellPrice).toLocaleString('id-ID')}</p>
              </div>
              <button onClick={() => adminAction(`/api/v1/old-school/products/${p.id}`, 'PATCH', { isActive: !p.isActive })} className="text-primary hover:underline">
                {p.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
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
            <div className="p-4 rounded-xl bg-surface border border-primary/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-cyber font-bold text-primary uppercase">Buat Voucher Baru</h3>
                <span className="text-[10px] text-slate-400 font-mono">Tipe: {createVoucherType.toUpperCase()}</span>
              </div>

              {/* Pilihan Jenis Voucher */}
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Pilih Jenis Voucher</label>
                <select
                  value={createVoucherType}
                  onChange={(e) => setCreateVoucherType(e.target.value as any)}
                  className="w-full bg-black/40 border border-surface-border rounded p-2 text-xs text-primary font-bold"
                >
                  <option value="promo">1. Promo Umum (Bisa Dipakai Semua User)</option>
                  <option value="new_user">2. New User Only (Order Pertama + Limit Harian)</option>
                  <option value="loyalty_points">3. Loyalty Points (Tukarkan Loyalty Point)</option>
                </select>
              </div>

              {/* Kolom Form Dinamis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Kode Voucher</label>
                  <input id="v-code" placeholder="e.g. WETRINEW / PROMO50 / LOYAL100" className="w-full bg-black/40 border border-surface-border rounded p-2 text-white uppercase font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tipe Diskon</label>
                  <select id="v-type" className="w-full bg-black/40 border border-surface-border rounded p-2 text-white">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (Nominal Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Nilai Diskon (% atau Rp)</label>
                  <input id="v-value" type="number" placeholder="e.g. 10 atau 15000" className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Total Kuota Tersedia</label>
                  <input id="v-quota" type="number" placeholder="Total Kuota (e.g. 100)" defaultValue={100} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Min Transaksi (Rp)</label>
                  <input id="v-min" type="number" placeholder="0 jika tanpa min transaksi" defaultValue={0} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Max Diskon (Cap Rp, opsional)</label>
                  <input id="v-max" type="number" placeholder="Max potongan jika % (opsional)" className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>

                {/* Kolom Khusus: new_user */}
                {createVoucherType === 'new_user' && (
                  <div className="sm:col-span-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <label className="text-[10px] text-blue-300 font-bold block mb-0.5">Limit Pemakaian Per Hari (Daily Limit)</label>
                    <input id="v-daily-limit" type="number" placeholder="Batas klaim per hari (e.g. 20)" defaultValue={20} className="w-full bg-black/40 border border-blue-500/40 rounded p-2 text-white text-xs" />
                    <p className="text-[10px] text-blue-300/80 mt-1">Otomatis hanya berlaku untuk user yang belum pernah memiliki riwayat transaksi SUCCESS.</p>
                  </div>
                )}

                {/* Kolom Khusus: loyalty_points */}
                {createVoucherType === 'loyalty_points' && (
                  <div className="sm:col-span-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <label className="text-[10px] text-purple-300 font-bold block mb-0.5">Poin Royalty Diperlukan (Points Required)</label>
                    <input id="v-points" type="number" placeholder="Poin yang dipotong dari user (e.g. 50)" defaultValue={50} className="w-full bg-black/40 border border-purple-500/40 rounded p-2 text-white text-xs" />
                    <p className="text-[10px] text-purple-300/80 mt-1">Sistem akan memeriksa saldo poin user dan memotong poin secara otomatis saat voucher dipakai.</p>
                  </div>
                )}
              </div>

              {/* Tanggal Mulai & Berakhir dengan Dropdown */}
              <div className="space-y-3 pt-2 border-t border-surface-border">
                {/* Tanggal Mulai Aktif */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tanggal & Waktu Mulai Aktif</label>
                  <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                    <select value={startDay} onChange={(e) => setStartDay(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Tgl {d}</option>)}
                    </select>
                    <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {[2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                    <select value={startMinute} onChange={(e) => setStartMinute(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {[0, 15, 30, 45, 59].map(min => <option key={min} value={min}>:{String(min).padStart(2, '0')}</option>)}
                    </select>
                  </div>
                </div>

                {/* Tanggal Berakhir */}
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Tanggal & Waktu Berakhir (Expire)</label>
                  <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
                    <select value={expDay} onChange={(e) => setExpDay(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Tgl {d}</option>)}
                    </select>
                    <select value={expMonth} onChange={(e) => setExpMonth(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={expYear} onChange={(e) => setExpYear(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {[2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={expHour} onChange={(e) => setExpHour(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                    </select>
                    <select value={expMinute} onChange={(e) => setExpMinute(Number(e.target.value))} className="bg-black/40 border border-surface-border rounded p-1.5 text-white">
                      {[0, 15, 30, 45, 59].map(min => <option key={min} value={min}>:{String(min).padStart(2, '0')}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  const code = (document.getElementById('v-code') as HTMLInputElement)?.value;
                  const discountType = (document.getElementById('v-type') as HTMLSelectElement)?.value;
                  const discountValue = (document.getElementById('v-value') as HTMLInputElement)?.value;
                  const minPurchase = (document.getElementById('v-min') as HTMLInputElement)?.value || '0';
                  const maxDiscount = (document.getElementById('v-max') as HTMLInputElement)?.value || null;
                  const quota = (document.getElementById('v-quota') as HTMLInputElement)?.value || '100';
                  const dailyLimit = createVoucherType === 'new_user' ? (document.getElementById('v-daily-limit') as HTMLInputElement)?.value || null : null;
                  const pointsRequired = createVoucherType === 'loyalty_points' ? (document.getElementById('v-points') as HTMLInputElement)?.value || '0' : '0';

                  const startDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
                  const expiresDate = new Date(expYear, expMonth - 1, expDay, expHour, expMinute);

                  if (!code || !discountValue) {
                    setActionMessage('Kode Voucher dan Nilai Diskon wajib diisi.');
                    return;
                  }

                  if (expiresDate <= startDate) {
                    setActionMessage('Tanggal berakhir harus lebih besar dari tanggal mulai.');
                    return;
                  }

                  if (createVoucherType === 'loyalty_points' && Number(pointsRequired) <= 0) {
                    setActionMessage('Voucher Loyalty Points membutuhkan Points Required > 0.');
                    return;
                  }

                  await adminAction('/api/v1/old-school/vouchers', 'POST', {
                    code: code.toUpperCase(),
                    voucherType: createVoucherType,
                    discountType,
                    discountValue,
                    minPurchase,
                    maxDiscount,
                    quota: Number(quota),
                    dailyLimit: dailyLimit ? Number(dailyLimit) : null,
                    pointsRequired: Number(pointsRequired),
                    startAt: startDate.toISOString(),
                    expiresAt: expiresDate.toISOString(),
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
                <h3 className="text-xs font-cyber font-bold text-secondary uppercase">Setting Voucher: {editingVoucher.code} ({editingVoucher.voucherType || 'promo'})</h3>
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
                  <label className="text-[10px] text-slate-400">Limit Harian (opsional)</label>
                  <input id="ve-daily-limit" type="number" defaultValue={editingVoucher.dailyLimit ?? ''} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Min Transaksi</label>
                  <input id="ve-min" type="number" defaultValue={editingVoucher.minPurchase} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Max Diskon</label>
                  <input id="ve-max" type="number" defaultValue={editingVoucher.maxDiscount ?? ''} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Points Required</label>
                  <input id="ve-points" type="number" defaultValue={editingVoucher.pointsRequired ?? 0} className="w-full bg-black/40 border border-surface-border rounded p-2 text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const discountValue = (document.getElementById('ve-value') as HTMLInputElement)?.value;
                    const quota = (document.getElementById('ve-quota') as HTMLInputElement)?.value;
                    const dailyLimit = (document.getElementById('ve-daily-limit') as HTMLInputElement)?.value || null;
                    const minPurchase = (document.getElementById('ve-min') as HTMLInputElement)?.value;
                    const maxDiscount = (document.getElementById('ve-max') as HTMLInputElement)?.value || null;
                    const pointsRequired = (document.getElementById('ve-points') as HTMLInputElement)?.value || '0';

                    await adminAction(`/api/v1/old-school/vouchers/${editingVoucher.id}`, 'PATCH', {
                      discountValue,
                      quota: Number(quota),
                      dailyLimit: dailyLimit ? Number(dailyLimit) : null,
                      minPurchase,
                      maxDiscount,
                      pointsRequired: Number(pointsRequired),
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
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {vouchers.map(v => {
              const nowTime = new Date();
              const isStarted = !v.startAt || new Date(v.startAt) <= nowTime;
              const isExpired = new Date(v.expiresAt) <= nowTime;
              const typeBadge =
                v.voucherType === 'new_user'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : v.voucherType === 'loyalty_points'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600';

              return (
                <div key={v.id} className="p-2.5 rounded-lg bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-white">{v.code}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${typeBadge}`}>
                        {v.voucherType === 'new_user' ? 'NEW USER' : v.voucherType === 'loyalty_points' ? 'LOYALTY PTS' : 'PROMO'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${!v.isActive ? 'bg-red-500/20 text-red-400 border border-red-500/40' : !isStarted ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-accent-green/20 text-accent-green border border-accent-green/40'}`}>
                        {!v.isActive ? 'KILLED' : !isStarted ? 'UPCOMING' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Diskon: {v.discountValue} {v.discountType === 'percentage' ? '%' : 'Rp'} • Quota: {v.quotaUsed}/{v.quota}
                      {v.dailyLimit ? ` • Limit/Hari: ${v.dailyLimit}` : ''}
                      {v.pointsRequired > 0 ? ` • Poin: ${v.pointsRequired}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Periode: {v.startAt ? new Date(v.startAt).toLocaleDateString('id-ID') : '-'} s/d {new Date(v.expiresAt).toLocaleDateString('id-ID')}
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
          <div className="flex items-center justify-between">
            <h2 className="text-base font-cyber font-bold text-white">Users & Fraud Control</h2>
            <span className="text-[11px] text-slate-400 font-mono">Total: {users.length}</span>
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {users.map(u => (
              <div key={u.id} className="p-2.5 rounded-lg bg-surface border border-surface-border flex items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{u.name || u.email}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${u.status === 'banned' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : u.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : 'bg-accent-green/20 text-accent-green border border-accent-green/40'}`}>
                      {u.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">{u.email} • Role: {u.role}</p>
                </div>
                <button
                  onClick={() => adminAction(`/api/v1/old-school/users/${u.id}/status`, 'POST', { status: u.status === 'banned' ? 'active' : 'banned', reason: u.status === 'banned' ? undefined : 'Fraud action from operator' })}
                  className={`px-2 py-1 rounded text-[11px] font-semibold ${u.status === 'banned' ? 'bg-accent-green/20 text-accent-green hover:bg-accent-green hover:text-black' : 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}
                >
                  {u.status === 'banned' ? 'Unban' : 'Ban User'}
                </button>
              </div>
            ))}
          </div>
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
