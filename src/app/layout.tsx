import type { Metadata } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
});

export const metadata: Metadata = {
  title: 'WETRI.COM | Vaporwave & Cyberpunk Top-up Destination',
  description: 'Top-up game, pulsa, dan voucher kilat dengan tema Cyberpunk, reward poin loyalti & diskon instan.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${orbitron.variable} dark`}>
      <body className="bg-background text-slate-100 min-h-screen flex flex-col antialiased selection:bg-primary selection:text-black">
        {/* Background Cyber Glow & Grid */}
        <div className="fixed inset-0 bg-cyber-grid bg-[size:40px_40px] pointer-events-none opacity-40 z-0" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-radial-glow pointer-events-none z-0" />

        <AuthProvider>
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
