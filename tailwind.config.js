/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#121826',
        'surface-card': 'rgba(18, 24, 38, 0.75)',
        'surface-border': 'rgba(0, 240, 255, 0.2)',
        primary: {
          DEFAULT: '#00F0FF',
          dark: '#00B8C4',
          glow: 'rgba(0, 240, 255, 0.35)',
        },
        secondary: {
          DEFAULT: '#FF007F',
          dark: '#C70063',
          glow: 'rgba(FF, 0, 127, 0.35)',
        },
        accent: {
          purple: '#9D00FF',
          yellow: '#FFE600',
          green: '#00FF66',
        },
        muted: '#8E9AA8',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        cyber: ['var(--font-orbitron)', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.5), 0 0 30px rgba(0, 240, 255, 0.2)',
        'neon-pink': '0 0 15px rgba(255, 0, 127, 0.5), 0 0 30px rgba(255, 0, 127, 0.2)',
        'neon-purple': '0 0 15px rgba(157, 0, 255, 0.5)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'cyber-grid': 'linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px)',
        'gradient-radial-glow': 'radial-gradient(circle at 50% 0%, rgba(0, 240, 255, 0.15), transparent 70%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(0, 240, 255, 0.6))' },
          '50%': { opacity: '0.7', filter: 'drop-shadow(0 0 5px rgba(0, 240, 255, 0.3))' },
        },
      },
    },
  },
  plugins: [],
};
