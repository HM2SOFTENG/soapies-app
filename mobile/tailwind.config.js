/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        pink: { DEFAULT: '#EC4899', 500: '#EC4899', 600: '#DB2777' },
        purple: { DEFAULT: '#A855F7', 500: '#A855F7', 600: '#9333EA' },
        violet: { DEFAULT: '#7C3AED', 600: '#7C3AED' },
        bg: '#0D0D0D',
        card: '#1A1A2E',
        border: '#2D2D44',
        muted: '#9CA3AF',
      },
    },
  },
  plugins: [],
};
