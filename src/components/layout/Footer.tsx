import { Shield, Zap, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="glass-panel border-t border-surface-border mt-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2">
            <span className="font-cyber font-bold text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-purple to-secondary">
              WETRI<span className="text-secondary text-sm">.COM</span>
            </span>
            <p className="text-sm text-slate-400 max-w-sm">
              Platform top-up game & produk digital otomatis 24/7 dengan tema Cyberpunk, instant delivery, dan sistem gamifikasi reward points.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-primary" /> Instan 3 Detik
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-accent-green" /> 100% Legal & Aman
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-secondary" /> Cashback Poin
              </span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-cyber text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Layanan</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/catalog" className="hover:text-primary transition-colors">Mobile Legends</a></li>
              <li><a href="/catalog" className="hover:text-primary transition-colors">Free Fire</a></li>
              <li><a href="/catalog" className="hover:text-primary transition-colors">PUBG Mobile</a></li>
              <li><a href="/catalog" className="hover:text-primary transition-colors">Pulsa & PLN</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-cyber text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Bantuan</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/faq" className="hover:text-secondary transition-colors">FAQ & Bantuan</a></li>
              <li><a href="/terms" className="hover:text-secondary transition-colors">Syarat & Ketentuan</a></li>
              <li><a href="/privacy" className="hover:text-secondary transition-colors">Kebijakan Privasi</a></li>
              <li><a href="/contact" className="hover:text-secondary transition-colors">Hubungi Kami (24/7)</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} WETRI.COM. All rights reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Powered by Next.js, ElysiaJS, Bun & Supabase <Heart className="w-3 h-3 text-secondary fill-secondary" />
          </p>
        </div>
      </div>
    </footer>
  );
}
