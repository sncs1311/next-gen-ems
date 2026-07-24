/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // EMS design palette — industrial fleet ops, not SaaS
        navy: {
          900: '#0F1923',
          800: '#1C2B3A',
          700: '#243447',
        },
        slate: {
          ems: '#F0F4F8',
        },
        amber: {
          ems: '#F59E0B',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
