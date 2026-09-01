"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Frontend User Dashboard – pulls data from `/api/v1/dashboard`.
 */
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const json = await res.json();
      setData(json);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || loading) return <p className="text-white">Loading dashboard…</p>;
  if (!data?.ok) return <p className="text-white">Failed to load dashboard.</p>;

  const { points, streak, recentTransactions, voucherHistory } = data;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-cyber font-bold text-white">Dashboard</h1>
      <section className="glass-panel p-4 border border-surface-border">
        <h2 className="text-xl font-bold text-primary mb-2">Profil</h2>
        <p className="text-slate-300">Poin: <span className="font-medium text-white">{points}</span></p>
        <p className="text-slate-300">Streak: <span className="font-medium text-white">{streak} hari</span></p>
      </section>
      <section className="glass-panel p-4 border border-surface-border">
        <h2 className="text-xl font-bold text-primary mb-2">Riwayat Transaksi</h2>
        <table className="w-full text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="text-left py-1">Order ID</th>
              <th className="text-left py-1">Jumlah</th>
              <th className="text-left py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((tx: any) => (
              <tr key={tx.orderId} className="border-t border-surface-border/30">
                <td className="py-1 text-slate-300">{tx.orderId}</td>
                <td className="py-1 text-slate-300">Rp {tx.amount}</td>
                <td className="py-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    tx.status === 'SUCCESS' ? 'bg-success/20 text-success' :
                    tx.status === 'FAILED' ? 'bg-danger/20 text-danger' :
                    'bg-warning/20 text-warning'
                  }`}>{tx.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="glass-panel p-4 border border-surface-border">
        <h2 className="text-xl font-bold text-primary mb-2">Voucher Saya</h2>
        <ul className="space-y-2">
          {voucherHistory.map((v: any) => (
            <li key={v.code} className="flex justify-between text-slate-300">
              <span>{v.code}</span>
              <span>{v.isUsed ? 'Terpakai' : 'Aktif'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

