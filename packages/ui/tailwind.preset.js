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
      /** Curvas e tempos das sobreposicoes (Modal/Drawer): entrada com
       *  desaceleracao suave, saida mais curta — o padrao das folhas do iOS. */
      keyframes: {
        'backdrop-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'backdrop-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(14px) scale(.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'modal-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(8px) scale(.98)' },
        },
        'sheet-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'sheet-out-right': { from: { transform: 'none' }, to: { transform: 'translateX(100%)' } },
        'sheet-in-bottom': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'sheet-out-bottom': { from: { transform: 'none' }, to: { transform: 'translateY(100%)' } },
      },
      animation: {
        'backdrop-in': 'backdrop-in .2s ease-out both',
        'backdrop-out': 'backdrop-out .18s ease-in both',
        'modal-in': 'modal-in .26s cubic-bezier(.32,.72,0,1) both',
        'modal-out': 'modal-out .18s ease-in both',
        'sheet-in-right': 'sheet-in-right .3s cubic-bezier(.32,.72,0,1) both',
        'sheet-out-right': 'sheet-out-right .2s cubic-bezier(.4,0,1,1) both',
        'sheet-in-bottom': 'sheet-in-bottom .3s cubic-bezier(.32,.72,0,1) both',
        'sheet-out-bottom': 'sheet-out-bottom .2s cubic-bezier(.4,0,1,1) both',
      },
    },
  },
  plugins: [],
};
