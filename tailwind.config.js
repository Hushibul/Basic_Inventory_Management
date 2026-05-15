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
        surface: '#FFFDF8',
        sand: '#F5E6D3',
        peach: '#FFE3C2',
        butter: '#FFD166',
        tomato: '#F05A28',
        charcoal: '#1F2937',
        olive: '#6B7A37',
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.08)',
        float: '0 18px 40px rgba(240, 90, 40, 0.14)',
      },
    },
  },
  plugins: [],
};
