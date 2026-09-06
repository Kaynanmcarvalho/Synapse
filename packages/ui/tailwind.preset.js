/** Preset compartilhado pelos apps web. Um so lugar define a paleta da marca. */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec4ff',
          400: '#59a3ff',
          500: '#3380fc',
          600: '#1d61f2',
          700: '#164cdf',
          800: '#193fb4',
          900: '#1a398e',
          950: '#142457',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
