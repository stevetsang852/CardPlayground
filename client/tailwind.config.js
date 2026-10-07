/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'game-bg': '#0F0D15',
        'game-surface': '#1A1721',
        'game-border': 'rgba(245,166,35,0.28)',
        'game-accent': '#F5A623',
        'game-gold': '#F5A623',
        'game-mythic': '#E8B4FF',
        atelier: {
          bg: '#0F0D15',
          surface: '#1A1721',
          warm: '#F5A623',
          cool: '#5B8DEF',
          rare: '#9B59B6',
          text: '#F0EDF5',
          muted: '#A09CA8',
        },
      },
      boxShadow: {
        glass: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 40px rgba(0,0,0,0.35)',
      },
      transitionDuration: {
        press: '80ms',
      },
    },
  },
  plugins: [],
};
