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

type SystemConfig = {
  id: string;
  key: string;
  value: string;
  description: string | null;
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

      const [mRes, lRes, cRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/old-school/metrics`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/audit-logs`, { headers }),
        fetch(`${apiBase}/api/v1/old-school/configs`, { headers }),
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
      if (cRes.ok) {
        const c = await cRes.json();
        setConfigs(c.configs ?? []);
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
