/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'game-bg': '#0a0a1a',
        'game-surface': '#1a1040',
        'game-border': '#3a2a6a',
        'game-accent': '#c8a0ff',
        'game-gold': '#ffd700',
        'game-mythic': '#ff80ff',
      }
    }
  },
  plugins: []
}
