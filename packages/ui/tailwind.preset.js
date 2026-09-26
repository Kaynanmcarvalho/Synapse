import { primitivos } from '@synapse/sdl/tokens';

/** Preset do web-admin e do web-vendedor.
 *
 *  O web-erp nao usa mais este arquivo: o tema dele vem do SDL
 *  (`@synapse/sdl/tailwind.preset.js`). Aqui continua o azul que estes dois apps
 *  ja renderizam, agora lido do proprio SDL — o valor deixa de existir em dois
 *  lugares, e a aparencia nao muda.
 *
 *  Levar tambem estes apps para o vocabulario do SDL (superficie, conteudo,
 *  estado) e assunto de uma fase propria: trocar a marca deles aqui mudaria a
 *  cor de telas que nao estao em revisao. */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: primitivos.azulLegado,
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
