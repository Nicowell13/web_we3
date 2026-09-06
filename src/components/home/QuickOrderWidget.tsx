'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Smartphone, Zap, Gamepad2, Search, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  denomination: string;
  sellPrice: string;
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

// Aliases for strict matching
const OPERATOR_KEYWORDS: Record<string, string[]> = {
  'Tri': ['tri', 'three', '3 '],
  'Telkomsel': ['telkomsel', 'tsel', 'simpati', 'as', 'loop', 'by.u', 'byu'],
  'Indosat': ['indosat', 'isat', 'im3', 'mentari'],
  'XL': ['xl', 'extra'],
  'Axis': ['axis'],
  'Smartfren': ['smartfren', 'smart'],
};

export default function QuickOrderWidget({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState<'pulsa' | 'data' | 'pln' | 'game'>('pulsa');
  
  // Pulsa & Data states
  const [phone, setPhone] = useState('');
  const [detectedOperator, setDetectedOperator] = useState<string | null>(null);

  // PLN state
  const [plnId, setPlnId] = useState('');

  // Game state
  const [selectedGame, setSelectedGame] = useState('mobile-legends');
  const [gameUserId, setGameUserId] = useState('');
  const [gameZoneId, setGameZoneId] = useState('ID');

  // Handle phone input & auto-detect
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setPhone(clean);
    if (clean.length >= 4) {
      const prefix = clean.slice(0, 4);
      setDetectedOperator(PREFIX_OPERATORS[prefix] ?? null);
    } else {
      setDetectedOperator(null);
    }
  };

  // Helper strict operator matcher
  const matchesOperator = (targetStr: string, opName: string) => {
    const keywords = OPERATOR_KEYWORDS[opName] || [opName.toLowerCase()];
    const lower = targetStr.toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  // Filter products by active tab & strict input
  const filteredProducts = useMemo(() => {
    if (activeTab === 'pulsa') {
      if (!phone || phone.length < 4 || !detectedOperator) {
        return []; // Do not display random products if operator is not detected
      }
      return products.filter(p => {
        const cat = (p.gameCategory || '').toLowerCase();
        const isPulsa = cat === 'pulsa' || p.denomination.toLowerCase().includes('pulsa');
        if (!isPulsa) return false;
        
        const combined = `${p.gameName || ''} ${p.denomination} ${p.name}`;
        return matchesOperator(combined, detectedOperator);
      });
    }

    if (activeTab === 'data') {
      if (!phone || phone.length < 4 || !detectedOperator) {
        return []; // Do not display random products if operator is not detected
      }
      return products.filter(p => {
        const cat = (p.gameCategory || '').toLowerCase();
        const isData = cat === 'data' || p.denomination.toLowerCase().includes('data') || p.denomination.toLowerCase().includes('gb');
        if (!isData) return false;

        const combined = `${p.gameName || ''} ${p.denomination} ${p.name}`;
        return matchesOperator(combined, detectedOperator);
      });
    }

    if (activeTab === 'pln') {
      return products.filter(p => {
        const cat = (p.gameCategory || '').toLowerCase();
        return cat === 'pln' || (p.gameName || '').toLowerCase().includes('pln') || p.denomination.toLowerCase().includes('pln');
      });
    }

    if (activeTab === 'game') {
      return products.filter(p => {
        const gId = (p.gameId || '').toLowerCase();
        const gName = (p.gameName || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();

        if (selectedGame === 'mobile-legends') {
          return gId.includes('mobile-legends') || gName.includes('mobile legends') || (pName.includes('diamond') && !pName.includes('magic chess') && !pName.includes('free fire'));
        }
        if (selectedGame === 'free-fire') {
          return gId.includes('free-fire') || gName.includes('free fire') || pName.includes('free fire');
        }
        if (selectedGame === 'magic-chess') {
          return gId.includes('magic-chess') || gName.includes('magic chess') || pName.includes('magic chess');
        }

        return gId.includes(selectedGame.toLowerCase()) || gName.includes(selectedGame.toLowerCase());
      });
    }

    return products;
  }, [products, activeTab, phone, detectedOperator, selectedGame]);

  return (
    <div className="glass-panel p-5 sm:p-7 rounded-2xl border border-surface-border shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mode / Type Toggle */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-black/40 border border-surface-border mb-6">
        <button
          onClick={() => setActiveTab('pulsa')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'pulsa' ? 'bg-primary text-black shadow-neon-cyan' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Pulsa</span>
        </button>

        <button
          onClick={() => setActiveTab('data')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'data' ? 'bg-primary text-black shadow-neon-cyan' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Paket Data</span>
        </button>

        <button
          onClick={() => setActiveTab('pln')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'pln' ? 'bg-primary text-black shadow-neon-cyan' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>PLN Token</span>
        </button>

        <button
          onClick={() => setActiveTab('game')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'game' ? 'bg-primary text-black shadow-neon-cyan' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Game</span>
        </button>
      </div>

      {/* Target Input Section */}
      <div className="space-y-4 mb-6">
        {(activeTab === 'pulsa' || activeTab === 'data') && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nomor Handphone
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Contoh: 089612345678"
                className="w-full bg-surface/80 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono"
              />
              {detectedOperator && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 border border-surface-border">
                  {OPERATOR_LOGOS[detectedOperator] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={OPERATOR_LOGOS[detectedOperator]} alt={detectedOperator} className="w-4 h-4 object-contain" />
                  )}
                  <span className="text-xs font-semibold text-primary">{detectedOperator}</span>
                </div>
              )}
            </div>
            {detectedOperator ? (
              <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operator: <strong>{detectedOperator}</strong>. Menampilkan produk {detectedOperator} saja.
              </p>
            ) : phone.length >= 4 ? (
              <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Prefix nomor tidak dikenali. Silakan periksa kembali nomor Anda.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ketik minimal 4 digit nomor HP untuk mendeteksi provider otomatis.
              </p>
            )}
          </div>
        )}

        {activeTab === 'pln' && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nomor Meter / ID Pelanggan PLN
            </label>
            <div className="relative">
              <input
                type="number"
                value={plnId}
                onChange={(e) => setPlnId(e.target.value)}
                placeholder="Masukkan 11-12 digit ID Pelanggan"
                className="w-full bg-surface/80 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded bg-black/50 border border-surface-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/providers/pln.svg" alt="PLN" className="w-4 h-4 object-contain" />
                <span className="text-xs font-bold text-amber-400">PLN PREPAID</span>
              </div>
            </div>
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
                  onChange={(e) => setGameUserId(e.target.value)}
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
          </div>
        )}
      </div>

      {/* Recommended Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-cyber font-bold text-white uppercase tracking-wider">
            Pilihan Nominal & Paket
          </h3>
          <span className="text-[10px] text-slate-400">
            {filteredProducts.length > 0 ? `${filteredProducts.length} pilihan tersedia` : ''}
          </span>
        </div>

        {(activeTab === 'pulsa' || activeTab === 'data') && (!phone || phone.length < 4 || !detectedOperator) ? (
          <div className="p-8 text-center rounded-xl bg-black/30 border border-surface-border">
            <p className="text-xs text-slate-300 font-medium mb-1">Masukkan Nomor Handphone Terlebih Dahulu</p>
            <p className="text-[11px] text-slate-500">
              Sistem akan otomatis menampilkan paket {activeTab === 'pulsa' ? 'pulsa reguler' : 'kuota data'} yang sesuai dengan operator nomor Anda.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-black/30 border border-surface-border">
            <p className="text-xs text-slate-400">
              {detectedOperator
                ? `Tidak ada produk ${activeTab} yang aktif untuk ${detectedOperator} saat ini.`
                : 'Tidak ada produk yang cocok untuk pilihan ini.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredProducts.slice(0, 16).map((item) => {
              const targetQuery = new URLSearchParams({
                ...(phone ? { phone, targetId: phone } : {}),
                ...(plnId ? { targetId: plnId } : {}),
                ...(gameUserId ? { targetId: gameUserId, ...(gameZoneId ? { serverId: gameZoneId } : {}) } : {}),
              }).toString();

              const checkoutHref = `/checkout/${item.id}${targetQuery ? `?${targetQuery}` : ''}`;

              return (
                <Link
                  key={item.id}
                  href={checkoutHref}
                  className="group flex flex-col justify-between p-3 rounded-xl bg-surface/60 border border-surface-border hover:border-primary hover:bg-surface transition-all duration-200 hover:shadow-neon-cyan"
                >
                  <div>
                    <span className="text-[10px] text-muted block mb-0.5">{item.gameName || activeTab.toUpperCase()}</span>
                    <h4 className="font-semibold text-xs text-white group-hover:text-primary transition-colors line-clamp-2">
                      {item.denomination}
                    </h4>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-cyber font-bold text-primary">
                      Rp {Number(item.sellPrice).toLocaleString('id-ID')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
