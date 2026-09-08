'use client';

import { getApiBaseUrl } from '@/lib/api-url';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/context/AuthContext';
import {
  Smartphone,
  Zap,
  Gamepad2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  CreditCard,
  Gift,
  ExternalLink,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  denomination: string;
  sellPrice: string;
  supplierStatus?: string;
  productType?: string | null;
  brand?: string | null;
  gameId: string;
  gameName?: string;
  gameCategory?: string;
  thumbnailUrl?: string | null;
};

const PREFIX_OPERATORS: Record<string, string> = {
  '0811': 'Telkomsel', '0812': 'Telkomsel', '0813': 'Telkomsel', '0821': 'Telkomsel', '0822': 'Telkomsel', '0852': 'Telkomsel', '0853': 'Telkomsel', '0823': 'Telkomsel',
  '0814': 'Indosat', '0815': 'Indosat', '0816': 'Indosat', '0855': 'Indosat', '0856': 'Indosat', '0857': 'Indosat', '0858': 'Indosat',
  '0817': 'XL', '0818': 'XL', '0819': 'XL', '0859': 'XL', '0877': 'XL', '0878': 'XL',
  '0831': 'Axis', '0832': 'Axis', '0833': 'Axis', '0838': 'Axis',
  '0895': 'Tri', '0896': 'Tri', '0897': 'Tri', '0898': 'Tri', '0899': 'Tri',
  '0881': 'Smartfren', '0882': 'Smartfren', '0883': 'Smartfren', '0884': 'Smartfren', '0885': 'Smartfren', '0886': 'Smartfren', '0887': 'Smartfren', '0888': 'Smartfren', '0889': 'Smartfren',
  '0851': 'Telkomsel',
};

const OPERATOR_LOGOS: Record<string, string> = {
  'Telkomsel': '/providers/telkomsel.svg',
  'Indosat': '/providers/indosat.svg',
  'XL': '/providers/xl.svg',
  'Axis': '/providers/axis.svg',
  'Tri': '/providers/tri.png',
  'Smartfren': '/providers/smartfren.svg',
  'PLN': '/providers/pln.svg',
};

const OPERATOR_KEYWORDS: Record<string, string[]> = {
  'Tri': ['tri', 'three', '3 '],
  'Telkomsel': ['telkomsel', 'tsel', 'simpati', 'as', 'loop', 'by.u', 'byu'],
  'Indosat': ['indosat', 'isat', 'im3', 'mentari'],
  'XL': ['xl', 'extra'],
  'Axis': ['axis'],
  'Smartfren': ['smartfren', 'smart'],
};

export default function QuickOrderWidget({ products }: { products: Product[] }) {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'pulsa' | 'data' | 'pln' | 'game'>('game');

  // Pulsa & Data states
  const [phone, setPhone] = useState('');
  const [detectedOperator, setDetectedOperator] = useState<string | null>(null);

  // PLN state & realtime inquiry
  const [plnId, setPlnId] = useState('');
  const [plnInquiryLoading, setPlnInquiryLoading] = useState(false);
  const [plnInquiryResult, setPlnInquiryResult] = useState<{ ok: boolean; maskedName?: string; segmentPower?: string; message?: string } | null>(null);

  // Game state
  const [selectedGame, setSelectedGame] = useState('mobile-legends');
  const [gameUserId, setGameUserId] = useState('');
  const [gameZoneId, setGameZoneId] = useState('ID');

  // Selected item state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Checkout Modal & Processing State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'created' | 'processing' | 'success'>('idle');

  // Load target memory from local storage on mount
  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem('wetri_last_phone');
      if (savedPhone) {
        setPhone(savedPhone);
        if (savedPhone.length >= 4) {
          setDetectedOperator(PREFIX_OPERATORS[savedPhone.slice(0, 4)] ?? null);
        }
      }
      const savedGameUser = localStorage.getItem('wetri_last_game_user');
      if (savedGameUser) setGameUserId(savedGameUser);
      const savedPln = localStorage.getItem('wetri_last_pln');
      if (savedPln) setPlnId(savedPln);
    } catch {}
  }, []);

  // Realtime PLN Inquiry debounce
  useEffect(() => {
    if (activeTab !== 'pln') return;
    const clean = plnId.replace(/\D/g, '');
    if (clean.length < 11) {
      setPlnInquiryResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPlnInquiryLoading(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/v1/supplier/inquire-pln`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerNo: clean }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setPlnInquiryResult({ ok: true, maskedName: data.maskedName, segmentPower: data.segmentPower });
        } else {
          setPlnInquiryResult({ ok: false, message: data.message || 'ID Pelanggan PLN tidak ditemukan' });
        }
      } catch {
        setPlnInquiryResult({ ok: false, message: 'Gagal menghubungi server PLN' });
      } finally {
        setPlnInquiryLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [plnId, activeTab]);

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setPhone(clean);
    try { localStorage.setItem('wetri_last_phone', clean); } catch {}
    if (clean.length >= 4) {
      const prefix = clean.slice(0, 4);
      setDetectedOperator(PREFIX_OPERATORS[prefix] ?? null);
    } else {
      setDetectedOperator(null);
    }
  };

  const matchesOperator = (targetStr: string, opName: string) => {
    const keywords = OPERATOR_KEYWORDS[opName] || [opName.toLowerCase()];
    const lower = targetStr.toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  const availableProducts = useMemo(() => {
    return (products || []).filter(p => !p.supplierStatus || p.supplierStatus === 'available');
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list: Product[] = [];
    if (activeTab === 'pulsa') {
      if (!phone || phone.length < 4 || !detectedOperator) return [];
      list = availableProducts.filter(p => {
        const brandMatch = (p.brand || p.gameName || '').toLowerCase();
        const matchesOp = matchesOperator(brandMatch, detectedOperator) || matchesOperator(p.name, detectedOperator);
        if (!matchesOp) return false;

        // Rule Tegas: Jika mengandung kata data/kuota/gb/internet, BUKAN pulsa reguler
        const combined = `${p.denomination} ${p.name || ''} ${p.productType || ''} ${p.gameCategory || ''}`.toLowerCase();
        const hasDataKeyword = combined.includes('data') || combined.includes('kuota') || combined.includes('internet') || combined.includes('gb') || combined.includes('unlimited') || combined.includes('combo') || combined.includes('flash') || combined.includes('freedom');

        return !hasDataKeyword;
      });
    } else if (activeTab === 'data') {
      if (!phone || phone.length < 4 || !detectedOperator) return [];
      list = availableProducts.filter(p => {
        const brandMatch = (p.brand || p.gameName || '').toLowerCase();
        const matchesOp = matchesOperator(brandMatch, detectedOperator) || matchesOperator(p.name, detectedOperator);
        if (!matchesOp) return false;

        // Rule Tegas: Wajib mengandung kata data/kuota/gb/internet
        const combined = `${p.denomination} ${p.name || ''} ${p.productType || ''} ${p.gameCategory || ''}`.toLowerCase();
        const hasDataKeyword = combined.includes('data') || combined.includes('kuota') || combined.includes('internet') || combined.includes('gb') || combined.includes('unlimited') || combined.includes('combo') || combined.includes('flash') || combined.includes('freedom');

        return hasDataKeyword;
      });
    } else if (activeTab === 'pln') {
      list = availableProducts.filter(p => {
        const cat = (p.gameCategory || '').toLowerCase();
        const gid = (p.gameId || '').toLowerCase();
        return cat === 'pln' || gid.includes('pln') || p.denomination.toLowerCase().includes('pln');
      });
    } else if (activeTab === 'game') {
      list = availableProducts.filter(p => {
        const gid = (p.gameId || '').toLowerCase();
        const gname = (p.gameName || '').toLowerCase();
        if (selectedGame === 'mobile-legends') return gid.includes('mobile-legends') || gid.includes('mlbb') || gname.includes('mobile legends');
        if (selectedGame === 'free-fire') return gid.includes('free-fire') || gid.includes('ff') || gname.includes('free fire');
        if (selectedGame === 'magic-chess') return gid.includes('magic-chess') || gname.includes('magic chess');
        return gid.includes(selectedGame);
      });
    }

    return list.slice().sort((a, b) => Number(a.sellPrice) - Number(b.sellPrice));
  }, [availableProducts, activeTab, phone, detectedOperator, selectedGame]);

  const isTargetFilled = () => {
    if (activeTab === 'pulsa' || activeTab === 'data') return phone.length >= 10 && Boolean(detectedOperator);
    if (activeTab === 'pln') return plnId.length >= 11 && plnInquiryResult?.ok === true;
    if (activeTab === 'game') return gameUserId.trim().length >= 4;
    return false;
  };

  const getTargetValues = () => {
    if (activeTab === 'pulsa' || activeTab === 'data') return { targetId: phone, serverId: undefined };
    if (activeTab === 'pln') return { targetId: plnId, serverId: undefined };
    return { targetId: gameUserId, serverId: selectedGame === 'free-fire' ? undefined : gameZoneId };
  };

  const selectedProduct = useMemo(() => {
    return availableProducts.find(p => p.id === selectedProductId) ?? null;
  }, [availableProducts, selectedProductId]);

  const handleStartCheckout = () => {
    if (!isTargetFilled() || !selectedProduct) {
      alert('Mohon lengkapi dan pastikan nomor target / ID akun Anda sudah valid.');
      return;
    }

    const { targetId, serverId } = getTargetValues();

    // Guest Auth Gate: Redirect to login preserving full checkout params
    if (!user) {
      const params = new URLSearchParams({
        targetId,
        ...(serverId ? { serverId } : {}),
      });
      const returnUrl = `/checkout/${selectedProduct.id}?${params.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    // Logged in: open DOKU in-page modal dialogbox
    setCheckoutError(null);
    setProcessingStatus('idle');
    setShowCheckoutModal(true);
  };

  const handleCreateDokuLink = async () => {
    if (!user || !selectedProduct) return;
    const { targetId, serverId } = getTargetValues();

    setIsCreatingLink(true);
    setCheckoutError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`${getApiBaseUrl()}/api/v1/payment/create-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          targetUserId: targetId,
          targetServerId: serverId,
          voucherCode: voucherCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Gagal membuat tagihan pembayaran.');
      }

      setActiveOrder(data);
      const dokuUrl = data.invoiceUrl || data.paymentUrl;
      if (dokuUrl) {
        const loadJokulCheckout = (window as Window & { loadJokulCheckout?: (url: string) => void }).loadJokulCheckout;
        if (typeof loadJokulCheckout !== 'function') {
          throw new Error('DOKU Checkout belum siap. Muat ulang halaman lalu coba lagi.');
        }
        loadJokulCheckout(dokuUrl);
        setProcessingStatus('created');
      } else {
        setProcessingStatus('success');
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Terjadi kesalahan sistem pembayaran.');
    } finally {
      setIsCreatingLink(false);
    }
  };

  return (
    <div className="glass-panel p-5 sm:p-7 rounded-2xl border border-surface-border space-y-6 shadow-neon-cyan relative overflow-hidden">
      <Script
        src={process.env.NEXT_PUBLIC_DOKU_ENV === 'production'
          ? 'https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js'
          : 'https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js'}
        strategy="afterInteractive"
      />
      {/* Top Tabs */}
      <div className="grid grid-cols-4 gap-2 p-1 rounded-xl bg-black/40 border border-surface-border">
        {[
          { id: 'game', label: 'Top-up Game', icon: Gamepad2 },
          { id: 'data', label: 'Paket Data', icon: Globe },
          { id: 'pln', label: 'Token PLN', icon: Zap },
          { id: 'pulsa', label: 'Pulsa', icon: Smartphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedProductId(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-cyber font-bold transition-all ${
                isActive
                  ? 'bg-primary text-black shadow-neon-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-surface/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Target Input Section */}
      <div className="space-y-2">
        {(activeTab === 'pulsa' || activeTab === 'data') && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Nomor Handphone</span>
              {detectedOperator && (
                <span className="flex items-center gap-1.5 text-primary text-[11px] font-mono font-bold">
                  {OPERATOR_LOGOS[detectedOperator] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={OPERATOR_LOGOS[detectedOperator]} alt={detectedOperator} className="w-4 h-4 object-contain" />
                  )}
                  {detectedOperator}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full bg-surface/80 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
              {detectedOperator && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-amber-400/90 font-mono mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              Pastikan No HP Anda benar. Kesalahan input nomor tujuan di luar tanggung jawab sistem.
            </p>
          </div>
        )}

        {activeTab === 'pln' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Nomor Meter / ID Pelanggan PLN (11-12 Digit)</span>
                {plnInquiryLoading && (
                  <span className="text-[10px] text-primary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Memeriksa nama...
                  </span>
                )}
              </label>
              <input
                type="text"
                value={plnId}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  setPlnId(clean);
                  try { localStorage.setItem('wetri_last_pln', clean); } catch {}
                }}
                placeholder="Contoh: 14123456789"
                className="w-full bg-surface/80 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
              <p className="text-[10px] text-amber-400/90 font-mono mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                Pastikan ID Pelanggan benar sebelum melakukan checkout.
              </p>
            </div>

            {plnInquiryResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  plnInquiryResult.ok
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                {plnInquiryResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>
                      Pelanggan terverifikasi: <strong className="text-white uppercase">{plnInquiryResult.maskedName}</strong>
                      {plnInquiryResult.segmentPower && <span className="block mt-1">Daya/Tarif: <strong className="text-white">{plnInquiryResult.segmentPower}</strong></span>}
                      <span className="block mt-1 text-[10px]">Pastikan nama tersensor ini sesuai sebelum checkout.</span>
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{plnInquiryResult.message}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'game' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Pilih Game</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'mobile-legends', name: 'Mobile Legends', logo: '/games/mobile-legends.png' },
                  { id: 'free-fire', name: 'Free Fire', logo: '/games/free-fire.png' },
                  { id: 'magic-chess', name: 'Magic Chess', logo: '/games/magic-chess.png' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGame(g.id);
                      setSelectedProductId(null);
                      if (g.id === 'free-fire') setGameZoneId('');
                      else if (!gameZoneId) setGameZoneId('ID');
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      selectedGame === g.id
                        ? 'bg-primary/10 border-primary text-white shadow-neon-cyan'
                        : 'bg-surface/50 border-surface-border text-slate-400 hover:text-white'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.logo} alt={g.name} className="w-6 h-6 rounded-md object-cover" />
                    <span className="text-[11px] font-semibold line-clamp-1">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`grid gap-2 ${selectedGame === 'free-fire' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">User ID Game</label>
                <input
                  type="text"
                  value={gameUserId}
                  onChange={(e) => {
                    setGameUserId(e.target.value);
                    try { localStorage.setItem('wetri_last_game_user', e.target.value); } catch {}
                  }}
                  placeholder="Contoh: 12345678"
                  className="w-full bg-surface/80 border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                />
              </div>
              {selectedGame !== 'free-fire' && (
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Zone / Server ID</label>
                  <input
                    type="text"
                    value={gameZoneId}
                    onChange={(e) => setGameZoneId(e.target.value)}
                    placeholder="Default: ID"
                    className="w-full bg-surface/80 border border-surface-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              )}
            </div>

            <p className="text-[10px] text-amber-400/90 font-mono flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              Pastikan User ID dan Server ID game Anda sudah sesuai.
            </p>
          </div>
        )}
      </div>

      {/* Recommended Products Grid with Promo Badges */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-cyber font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Pilihan Nominal & Promo
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredProducts.length > 0 ? `${filteredProducts.length} produk siap kirim` : ''}
          </span>
        </div>

        {(activeTab === 'pulsa' || activeTab === 'data') && (!phone || phone.length < 4 || !detectedOperator) ? (
          <div className="p-8 text-center rounded-xl bg-black/30 border border-surface-border space-y-1">
            <p className="text-xs text-slate-300 font-medium">Masukkan Nomor Handphone Terlebih Dahulu</p>
            <p className="text-[11px] text-slate-500">
              Sistem akan otomatis menampilkan paket {activeTab === 'pulsa' ? 'pulsa' : 'kuota'} yang sesuai dengan operator nomor Anda.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-black/30 border border-surface-border">
            <p className="text-xs text-slate-400">Belum ada denom aktif untuk pilihan ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((p, idx) => {
              const isSelected = selectedProductId === p.id;
              const sellPriceNum = Number(p.sellPrice);
              const fakeOriginalPrice = Math.ceil(sellPriceNum * 1.12);
              const promoLabels = ['🔥 PROMO', '⚡ INSTANT', '💎 HEMAT'];
              const badge = promoLabels[idx % promoLabels.length];
              const detailText = p.denomination.replace(/\s+/g, ' ').trim();
              const productLabel = (p.name || p.gameName || p.gameCategory || 'Produk WETRI').replace(detailText, '').trim();

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className={`min-h-[138px] p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between touch-manipulation ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-neon-cyan scale-[1.02]'
                      : 'bg-surface/60 border-surface-border hover:border-primary/50 hover:bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2 py-1 rounded-lg text-[9px] font-bold bg-secondary/20 text-secondary border border-secondary/40 font-mono shrink-0">
                      {badge}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-cyber font-black text-white text-sm sm:text-[13px] leading-snug break-words group-hover:text-primary transition-colors">
                      {detailText}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-snug break-words">
                      {productLabel || `${activeTab === 'game' ? 'Top-up game' : activeTab === 'data' ? 'Paket internet' : activeTab === 'pln' ? 'Token listrik' : 'Pulsa reguler'} siap kirim`}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-border/50 flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 line-through block">
                        Rp {fakeOriginalPrice.toLocaleString('id-ID')}
                      </span>
                      <p className="text-primary font-mono font-black text-sm">
                        Rp {sellPriceNum.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button for Instant Checkout */}
      {selectedProduct && (
        <div className="pt-2 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-xs text-slate-300">
            <span>Item Terpilih: </span>
            <strong className="text-white font-mono">{selectedProduct.denomination}</strong>
            <span className="text-primary font-mono font-bold ml-2">Rp {Number(selectedProduct.sellPrice).toLocaleString('id-ID')}</span>
          </div>

          <button
            disabled={!isTargetFilled()}
            onClick={handleStartCheckout}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-cyber font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-neon-cyan bg-primary text-black hover:bg-white active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-primary"
          >
            <span>BELI SEKARANG</span>
            <Zap className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      )}

      {/* Direct In-Page DOKU Payment Dialogbox Modal */}
      {showCheckoutModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-primary/50 max-w-lg w-full space-y-5 shadow-2xl relative animate-in zoom-in-95">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-surface text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-surface-border pb-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="font-cyber font-bold text-white text-base">Checkout DOKU Payment</h3>
            </div>

            {/* Order Summary Box */}
            <div className="p-3.5 rounded-xl bg-surface/80 border border-surface-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Produk:</span>
                <span className="font-bold text-white">{selectedProduct.denomination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tujuan:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {getTargetValues().targetId}{getTargetValues().serverId ? ` (${getTargetValues().serverId})` : ''}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-surface-border font-bold">
                <span className="text-slate-300">Total Pembayaran:</span>
                <span className="text-primary font-mono text-sm">
                  Rp {Number(selectedProduct.sellPrice).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-purple-300 font-mono pt-1">
                <span className="flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  Estimasi Poin Didapat:
                </span>
                <strong className="text-purple-400">+{Math.floor(Number(selectedProduct.sellPrice) / 1000)} Poin</strong>
              </div>
            </div>

            {/* Voucher Input */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Punya Kode Voucher? (Opsional)</label>
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="e.g. WETRINEW / COMP-XXXXXX"
                className="w-full bg-black/40 border border-surface-border rounded-lg p-2 text-xs text-white font-mono uppercase focus:border-primary focus:outline-none"
              />
            </div>

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Processing / Success Status States */}
            {processingStatus === 'created' && (
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/40 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-xs font-cyber font-bold text-white">Menunggu Pembayaran di DOKU...</p>
                <p className="text-[11px] text-slate-400">Selesaikan pembayaran melalui popup QRIS DOKU.</p>
                <button
                  onClick={() => setProcessingStatus('success')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 hover:text-white"
                >
                  Cek Status Transaksi
                </button>
              </div>
            )}

            {processingStatus === 'success' && (
              <div className="p-5 rounded-xl bg-purple-950/40 border border-purple-500/50 text-center space-y-2 animate-in zoom-in-95">
                <Sparkles className="w-8 h-8 text-secondary mx-auto animate-bounce" />
                <h4 className="font-cyber font-bold text-white text-sm">🎉 Transaksi Berhasil Diproses!</h4>
                <p className="text-xs text-purple-200 font-mono">
                  ✨ Selamat! Anda mendapatkan <strong className="text-purple-300 font-bold">+{Math.floor(Number(selectedProduct.sellPrice) / 1000)} Poin Royalti</strong> WETRI!
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-black font-cyber font-bold text-xs shadow-neon-cyan"
                >
                  <span>Buka Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {processingStatus === 'idle' && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface border border-surface-border text-slate-300 text-xs font-semibold hover:text-white"
                >
                  Batal
                </button>
                <button
                  disabled={isCreatingLink}
                  onClick={handleCreateDokuLink}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-black font-cyber font-bold text-xs hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-neon-cyan"
                >
                  {isCreatingLink ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyiapkan DOKU...</span>
                    </>
                  ) : (
                    <>
                      <span>Bayar via DOKU</span>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
