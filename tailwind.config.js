/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0F172A',
        slate: '#475569',
        mist: '#E2E8F0',
        canvas: '#F8FAFC',
        brand: '#0F766E',
        brandDark: '#115E59',
        accent: '#F97316',
        danger: '#DC2626',
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
