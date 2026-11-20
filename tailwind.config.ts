import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.ts'],
  theme: {
    extend: {
      colors: {
        bg: '#080E20',
        card: '#111A36',
        line: 'rgba(255,255,255,0.08)',
        brand: { DEFAULT: '#7B2FF7', dark: '#6A1FE6', light: '#A98BFF' },
        accent: { DEFAULT: '#10D7EF', dark: '#3677FF' }, // dark = brand blue
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'Hind Siliguri', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        gradient: { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        blob: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(40px,-30px) scale(1.1)' }, '66%': { transform: 'translate(-30px,20px) scale(0.95)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
        pulseRing: { '0%': { transform: 'scale(.9)', opacity: '.7' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        marquee: 'marquee 35s linear infinite',
        gradient: 'gradient 6s ease infinite',
        blob: 'blob 18s ease-in-out infinite',
        'fade-up': 'fade-up .6s ease-out both',
        ring: 'pulseRing 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
