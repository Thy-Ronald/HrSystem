/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7fb',
          100: '#e8eef7',
          200: '#cbd8ec',
          300: '#a6bcde',
          400: '#7292c8',
          500: '#4c70ae',
          600: '#3b598f',
          700: '#314874',
          800: '#2c3e63',
          900: '#263451',
        },
      },
    },
  },
  plugins: [],
};

