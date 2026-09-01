"use client";

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Sparkles,
  Ticket,
  Clock,
  Headphones,
  Upload,
  CalendarCheck,
  Flame,
  Coins,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'activity' | 'vouchers' | 'support'>('overview');
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daily checkin state
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);

  // Voucher claim state
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Copy helper state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Support WhatsApp contextual message builder
  const [supportCategory, setSupportCategory] = useState<'order' | 'points' | 'voucher' | 'general'>('order');
  const [supportOrderId, setSupportOrderId] = useState('');
  const [supportNotes, setSupportNotes] = useState('');

  const fetchDashboard = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Handle Avatar File Upload to Cloudinary via backend
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Allowed image formats
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.');
      return;
    }

    // Validate size < 3MB
    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Ukuran file maksimal 3MB (akan otomatis dikonversi ke WebP).');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const token = await user.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/user/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64 }),
        });
        const json = await res.json();
        if (json.ok) {
          setAvatarSuccess('Avatar berhasil dikonversi ke WebP & disimpan!');
          setData((prev: any) => ({
            ...prev,
            profile: { ...prev.profile, avatarUrl: json.avatarUrl },
          }));
        } else {
          setAvatarError(json.message || 'Gagal mengunggah avatar');
        }
        setUploadingAvatar(false);
      };
    } catch (err: any) {
      setAvatarError(err.message || 'Gagal membaca file');
      setUploadingAvatar(false);
    }
  };

  // Daily Checkin action
  const handleDailyCheckin = async () => {
    if (!user || checkingIn) return;
    setCheckingIn(true);
    setCheckinMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        setCheckinMsg(`Check-in berhasil! +${json.pointsEarned} Poin (Streak: ${json.streak} hari)`);
        await fetchDashboard();
      } else {
        setCheckinMsg(json.message || 'Gagal check-in hari ini');
      }
    } catch (err: any) {
      setCheckinMsg('Koneksi terputus saat check-in');
    } finally {
      setCheckingIn(false);
    }
  };

  // Claim voucher action
  const handleClaimVoucher = async (code: string) => {
    if (!user || claimingCode) return;
    setClaimingCode(code);
    setClaimMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/voucher/claim`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.ok) {
        setClaimMsg({ text: `Voucher ${code} berhasil diklaim!`, ok: true });
        await fetchDashboard();
      } else {
        setClaimMsg({ text: json.message || 'Gagal klaim voucher', ok: false });
      }
    } catch (e: any) {
      setClaimMsg({ text: 'Gagal menghubungkan ke server voucher', ok: false });
    } finally {
      setClaimingCode(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Build modern WhatsApp message
  const launchWhatsApp = () => {
    const waNumber = '6281234567890'; // dynamic support number
    const userName = data?.profile?.name || user?.displayName || 'User WETRI';
    const userEmail = data?.profile?.email || user?.email || '-';

    let text = `*Halo Tim CS WETRI.COM*\n`;
    text += `Nama: ${userName}\n`;
    text += `Email: ${userEmail}\n`;
    text += `Kategori: ${supportCategory.toUpperCase()}\n`;

    if (supportCategory === 'order' && supportOrderId) {
      text += `Order ID: ${supportOrderId}\n`;
    }

    if (supportNotes) {
      text += `Pesan/Kendala: ${supportNotes}\n`;
    } else {
      text += `Pesan: Saya ingin menanyakan informasi terkait ${supportCategory}.\n`;
    }

    text += `\n_Dikirim dari Dashboard WETRI.COM_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${waNumber}?text=${encoded}`, '_blank');
  };

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-xl border-2 border-primary border-t-transparent animate-spin" />
        <p className="font-cyber text-primary tracking-widest animate-pulse">MEMUAT DATA DASHBOARD...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-surface-border text-center space-y-6 shadow-neon-cyan">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-primary/50 mx-auto flex items-center justify-center text-primary">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-cyber font-bold text-white">AKSES DASHBOARD</h1>
            <p className="text-sm text-slate-400">
              Masuk dengan akun Google untuk melihat transaksi, klaim voucher promo, dan daily streak poin.
            </p>
          </div>
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-primary via-accent-purple to-secondary text-black font-bold text-sm tracking-wider uppercase hover:opacity-95 transition-all shadow-neon-cyan"
          >
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  const profile = data?.profile || {
    name: user.displayName || 'Gamer WETRI',
    email: user.email,
    avatarUrl: user.photoURL || `https://api.dicebear.com/9.x/bottts/svg?seed=${user.uid}`,
  };
  const points = data?.points ?? 0;
  const streak = data?.streak ?? 0;
  const isCheckedInToday = data?.isCheckedInToday ?? false;
  const recentTransactions = data?.recentTransactions || [];
  const ownedVouchers = data?.ownedVouchers || [];
  const availableVouchers = data?.availableVouchers || [];
  const activityTimeline = data?.activityTimeline || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Card */}
      <div className="glass-panel rounded-2xl border border-surface-border p-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
          {/* Avatar & User Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl border-2 border-primary/50 overflow-hidden bg-surface p-1 shadow-neon-cyan group-hover:border-primary transition-all">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-primary text-black hover:bg-white transition-all shadow-md group-hover:scale-110"
                title="Ganti Avatar (Cloudinary)"
              >
                {uploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Format: JPG, PNG, WEBP, GIF (Max 3MB, auto-convert WebP 256x256)
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-2xl font-cyber font-bold text-white tracking-wide">{profile.name}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/40 uppercase">
                  VIP GAMER
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">{profile.email}</p>
              
              {/* Feedback messages */}
              {avatarSuccess && (
                <p className="text-xs text-accent-green flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {avatarSuccess}
                </p>
              )}
              {avatarError && (
                <p className="text-xs text-secondary flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {avatarError}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics & Daily Checkin */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Points Card */}
            <div className="glass-panel px-4 py-3 rounded-xl border border-primary/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/40 flex items-center justify-center text-primary">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Royalty Poin</p>
                <p className="text-xl font-bold font-cyber text-primary">{points.toLocaleString('id-ID')}</p>
              </div>
            </div>

            {/* Streak Card */}
            <div className="glass-panel px-4 py-3 rounded-xl border border-secondary/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/40 flex items-center justify-center text-secondary">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Daily Streak</p>
                <p className="text-xl font-bold font-cyber text-secondary">{streak} Hari</p>
              </div>
            </div>

            {/* Daily Check-in Button */}
            <button
              onClick={handleDailyCheckin}
              disabled={isCheckedInToday || checkingIn}
              className={`px-4 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 ${
                isCheckedInToday
                  ? 'bg-surface border border-accent-green/40 text-accent-green cursor-default'
                  : 'bg-gradient-to-r from-accent-green to-primary text-black hover:opacity-90 shadow-neon-cyan'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{isCheckedInToday ? 'Checked-In Hari Ini' : checkingIn ? 'Memproses...' : 'Klaim Check-In'}</span>
            </button>
          </div>
        </div>

        {checkinMsg && (
          <div className="mt-4 p-2.5 rounded-lg bg-surface border border-primary/40 text-xs text-primary text-center font-medium">
            {checkinMsg}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-primary text-black shadow-neon-cyan'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Ringkasan
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-primary text-black shadow-neon-cyan'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Riwayat Transaksi
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'activity'
              ? 'bg-primary text-black shadow-neon-cyan'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Clock className="w-4 h-4" /> Timeline Aktivitas
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'vouchers'
              ? 'bg-primary text-black shadow-neon-cyan'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Ticket className="w-4 h-4" /> Loyalty & Voucher
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
            activeTab === 'support'
              ? 'bg-secondary text-black shadow-neon-pink'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          <Headphones className="w-4 h-4 text-secondary group-hover:text-white" /> Bantuan CS WhatsApp
        </button>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactios Mini */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-cyber font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" /> Transaksi Terakhir
              </h2>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Lihat Semua &rarr;
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-3">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
                <p>Belum ada transaksi. Mulai top up game favoritmu!</p>
                <Link
                  href="/catalog"
                  className="inline-block px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold uppercase tracking-wider"
                >
                  Buka Katalog Game
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((tx: any) => (
                  <div
                    key={tx.orderId}
                    className="p-3.5 rounded-xl bg-surface/60 border border-surface-border flex items-center justify-between hover:border-primary/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          #{tx.orderId.slice(-10)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.status === 'SUCCESS'
                              ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                              : tx.status === 'FAILED'
                              ? 'bg-secondary/20 text-secondary border border-secondary/30'
                              : 'bg-primary/20 text-primary border border-primary/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Game: {tx.gameId || 'Top Up'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-white">Rp {Number(tx.amount).toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Promo / Quick Vouchers */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
            <h2 className="text-lg font-cyber font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-secondary" /> Voucher Tersedia
            </h2>
            {availableVouchers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada voucher yang dapat diklaim saat ini.</p>
            ) : (
              <div className="space-y-3">
                {availableVouchers.slice(0, 3).map((v: any) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-surface border border-secondary/30 space-y-2 hover:border-secondary transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-secondary px-2 py-0.5 rounded bg-secondary/10 border border-secondary/30">
                        {v.code}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Butuh {v.pointsRequired} Pts
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Diskon {v.discountType === 'percentage' ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString('id-ID')}`}
                    </p>
                    <button
                      onClick={() => handleClaimVoucher(v.code)}
                      disabled={claimingCode === v.code || points < v.pointsRequired}
                      className="w-full py-1.5 rounded-lg bg-secondary text-black font-bold text-[11px] tracking-wide hover:opacity-90 transition disabled:opacity-50"
                    >
                      {claimingCode === v.code ? 'Mengklaim...' : points < v.pointsRequired ? 'Poin Kurang' : 'Klaim Sekarang'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setActiveTab('vouchers')}
              className="w-full py-2 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 hover:text-white hover:border-primary transition"
            >
              Lihat Semua Voucher &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: TRANSACTION HISTORY */}
      {activeTab === 'history' && (
        <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-cyber font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" /> Riwayat Transaksi Lengkap
              </h2>
              <p className="text-xs text-slate-400">Daftar semua transaksi yang pernah dilakukan akun kamu.</p>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-600" />
              <p>Belum ada transaksi ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Game / Target</th>
                    <th className="py-3 px-4">Jumlah</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/40">
                  {recentTransactions.map((tx: any) => (
                    <tr key={tx.orderId} className="hover:bg-surface/40 transition">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{tx.orderId}</span>
                        <button
                          onClick={() => copyToClipboard(tx.orderId)}
                          className="text-slate-400 hover:text-primary transition"
                          title="Salin Order ID"
                        >
                          {copiedId === tx.orderId ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <span className="font-semibold text-white">{tx.gameId || 'Game Top-up'}</span>
                        <span className="block text-[11px] text-slate-400">
                          ID: {tx.targetUserId} {tx.targetServerId ? `(${tx.targetServerId})` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-white font-mono">
                        Rp {Number(tx.amount).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                            tx.status === 'SUCCESS'
                              ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                              : tx.status === 'FAILED'
                              ? 'bg-secondary/20 text-secondary border border-secondary/40'
                              : 'bg-primary/20 text-primary border border-primary/40'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                        {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSupportOrderId(tx.orderId);
                            setSupportCategory('order');
                            setActiveTab('support');
                          }}
                          className="text-xs text-secondary hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <Headphones className="w-3.5 h-3.5" /> Bantuan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: ACTIVITY TIMELINE */}
      {activeTab === 'activity' && (
        <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-6">
          <div>
            <h2 className="text-xl font-cyber font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Timeline Aktivitas Akun
            </h2>
            <p className="text-xs text-slate-400">Jejak aktivitas transaksi, daily streak, dan penggunaan voucher kamu.</p>
          </div>

          {activityTimeline.length === 0 ? (
            <p className="text-center py-10 text-slate-400">Belum ada jejak aktivitas tercatat.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-border">
              {activityTimeline.map((item: any) => (
                <div key={item.id} className="relative group">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-surface border-2 border-primary group-hover:bg-primary transition-all" />
                  <div className="glass-panel p-4 rounded-xl border border-surface-border/60 hover:border-primary/40 transition-all space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {item.title}
                        {item.status && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                            {item.status}
                          </span>
                        )}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{item.description}</p>
                    {item.amount && <p className="text-xs font-bold text-primary">{item.amount}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: VOUCHERS & LOYALTY */}
      {activeTab === 'vouchers' && (
        <div className="space-y-6">
          {claimMsg && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-center gap-2 ${
                claimMsg.ok
                  ? 'bg-accent-green/10 border-accent-green text-accent-green'
                  : 'bg-secondary/10 border-secondary text-secondary'
              }`}
            >
              {claimMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{claimMsg.text}</span>
            </div>
          )}

          {/* Vouchers to Claim */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
            <h2 className="text-xl font-cyber font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" /> Voucher Tersedia untuk Diklaim
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableVouchers.map((v: any) => (
                <div
                  key={v.id}
                  className="glass-panel p-4 rounded-xl border border-secondary/30 flex flex-col justify-between gap-4 hover:border-secondary transition shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/30">
                        {v.code}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">{v.pointsRequired} Poin</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      Diskon {v.discountType === 'percentage' ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString('id-ID')}`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Min. Belanja: Rp {Number(v.minPurchase || 0).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Berlaku s/d {new Date(v.expiresAt).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaimVoucher(v.code)}
                    disabled={claimingCode === v.code || points < v.pointsRequired}
                    className="w-full py-2 rounded-lg bg-secondary text-black font-bold text-xs tracking-wider uppercase hover:opacity-90 transition disabled:opacity-40"
                  >
                    {claimingCode === v.code ? 'Mengklaim...' : points < v.pointsRequired ? 'Poin Kurang' : 'Klaim Voucher'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Owned Vouchers */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
            <h2 className="text-xl font-cyber font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" /> Voucher Saya
            </h2>
            {ownedVouchers.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Kamu belum memiliki voucher yang tersimpan.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownedVouchers.map((v: any) => (
                  <div
                    key={v.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      v.isUsed
                        ? 'bg-surface/40 border-surface-border opacity-60'
                        : 'bg-surface border-primary/40 shadow-neon-cyan'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-sm text-primary">{v.code}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            v.isUsed ? 'bg-slate-700 text-slate-300' : 'bg-accent-green/20 text-accent-green'
                          }`}
                        >
                          {v.isUsed ? 'TERPAKAI' : 'AKTIF'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Diskon {v.discountType === 'percentage' ? `${v.discountValue}%` : `Rp ${v.discountValue.toLocaleString('id-ID')}`}
                      </p>
                    </div>
                    <Link
                      href="/catalog"
                      className="w-full py-1.5 text-center rounded-lg bg-primary/20 border border-primary/50 text-primary text-xs font-bold hover:bg-primary hover:text-black transition"
                    >
                      Gunakan di Katalog &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: DYNAMIC WHATSAPP CS */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Form: Support Topic & Context */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-surface-border space-y-6">
            <div>
              <h2 className="text-xl font-cyber font-bold text-white flex items-center gap-2">
                <Headphones className="w-5 h-5 text-secondary" /> Customer Support Interaktif
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pilih topik kendala di bawah untuk memformat pesan bantuan otomatis yang siap dikirimkan ke Tim CS WETRI.
              </p>
            </div>

            {/* Topic Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Pilih Topik Bantuan</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'order', label: 'Kendala Transaksi', icon: ShoppingBag },
                  { id: 'points', label: 'Poin & Streak', icon: Coins },
                  { id: 'voucher', label: 'Klaim Voucher', icon: Ticket },
                  { id: 'general', label: 'Pertanyaan Umum', icon: MessageSquare },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = supportCategory === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSupportCategory(t.id as any)}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                        isSelected
                          ? 'bg-secondary/20 border-secondary text-secondary shadow-neon-pink'
                          : 'bg-surface border-surface-border text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional Order ID Input */}
            {supportCategory === 'order' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Pilih Order ID Terkait
                </label>
                {recentTransactions.length > 0 ? (
                  <select
                    value={supportOrderId}
                    onChange={(e) => setSupportOrderId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-white text-xs font-mono focus:border-secondary outline-none"
                  >
                    <option value="">-- Pilih dari riwayat transaksi --</option>
                    {recentTransactions.map((tx: any) => (
                      <option key={tx.orderId} value={tx.orderId}>
                        {tx.orderId} | {tx.gameId} | Rp {Number(tx.amount).toLocaleString('id-ID')} ({tx.status})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Contoh: WETRI-17252000-XYZ"
                    value={supportOrderId}
                    onChange={(e) => setSupportOrderId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-white text-xs font-mono focus:border-secondary outline-none"
                  />
                )}
              </div>
            )}

            {/* Custom Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Detail Tambahan (Opsional)
              </label>
              <textarea
                rows={4}
                value={supportNotes}
                onChange={(e) => setSupportNotes(e.target.value)}
                placeholder="Tuliskan kendala spesifik kamu (misal: pembayaran berhasil tapi diamond belum masuk)..."
                className="w-full px-4 py-3 rounded-xl bg-surface border border-surface-border text-white text-xs focus:border-secondary outline-none"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={launchWhatsApp}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-accent-green via-primary to-secondary text-black font-cyber font-bold text-sm tracking-wider uppercase hover:opacity-95 transition-all shadow-neon-cyan flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Kirim Pesan WhatsApp ke CS
            </button>
          </div>

          {/* Right Info Card: CS Operational Status */}
          <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-cyber font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-accent-green" /> Status Layanan CS
              </h3>
              
              <div className="p-4 rounded-xl bg-surface border border-accent-green/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-ping" />
                  <span className="text-xs font-bold text-accent-green">CS ONLINE (24/7 Fast Response)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Rata-rata waktu respon: <span className="font-bold text-white">&lt; 3 Menit</span>
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <p className="font-semibold text-slate-200">Panduan Bantuan Cepat:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Sertakan bukti transfer jika transaksi bermasalah.</li>
                  <li>Pastikan User ID dan Server ID game sudah sesuai.</li>
                  <li>Voucher yang hangus tidak dapat dikembalikan.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface/50 border border-surface-border text-center">
              <p className="text-[11px] text-slate-400">Jam Operasional Server Top-Up</p>
              <p className="text-xs font-mono font-bold text-primary">24 JAM NON-STOP OTOMATIS</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
