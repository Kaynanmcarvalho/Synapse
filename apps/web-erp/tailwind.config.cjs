/* CommonJS de proposito: o Tailwind recarrega uma config .cjs a cada alteracao.
 * Em ESM o Node guarda o arquivo no cache de modulos, que o Tailwind nao
 * consegue limpar, e a mudanca so aparece depois de reiniciar o servidor.
 * O preset continua em ESM — `require` de ESM funciona e devolve o namespace. */
const presetModule = require('@synapse/ui/tailwind.preset.js');
const preset = presetModule.default ?? presetModule;

/** Design system da retaguarda, em modo claro: canvas branco, neutros quentes,
 *  cobalto como unico carimbo da marca, Inter com corte Display nos titulos.
 *
 *  `slate` e `blue` sao remapeados para os neutros e o cobalto do sistema: as
 *  telas que ja usavam essas classes herdam a paleta sem precisar ser reescritas.
 *
 *  Raios do sistema x Tailwind: sm 8px = rounded-lg, md 12px = rounded-xl,
 *  lg 20px = rounded-2xl, xl 28px = rounded-3xl, full = rounded-full. */
const neutros = {
  50: '#f4f4f4',
  100: '#ededee',
  200: '#e2e2e7',
  300: '#c9c9cd',
  400: '#8d969e',
  500: '#5c5e60',
  600: '#505a63',
  700: '#3a3d40',
  800: '#1f2226',
  900: '#191c1f',
  950: '#000000',
};

const cobalto = {
  50: '#eff0fd',
  100: '#e0e2fb',
  200: '#c4c6f6',
  300: '#a0a3f0',
  400: '#7a7ee9',
  500: '#4f55f1',
  600: '#494fdf',
  700: '#3a40c4',
  800: '#31369f',
  900: '#2b2f7e',
  950: '#1b1d4d',
};

/** O sistema nao usa sombra em cartao: profundidade vem de borda e superficie.
 *  Sobra so para o que flutua de verdade (menus, modais), bem discreta. */
const flutuante = '0 12px 32px -8px rgba(25, 28, 31, 0.14)';

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: neutros,
        blue: cobalto,
        brand: cobalto,
        primary: { DEFAULT: '#494fdf', bright: '#4f55f1', deep: '#3a40c4', on: '#ffffff' },
        canvas: { light: '#ffffff', dark: '#000000' },
        surface: { soft: '#f4f4f4', card: '#ffffff', deep: '#0a0a0a', elevated: '#16181a' },
        hairline: { light: '#e2e2e7', strong: '#191c1f' },
        ink: '#191c1f',
        body: '#1f2226',
        charcoal: '#3a3d40',
        mute: '#505a63',
        ash: '#5c5e60',
        stone: '#8d969e',
        faint: '#c9c9cd',
        accent: {
          teal: '#00a87e',
          'light-blue': '#007bc2',
          link: '#376cd5',
          'light-green': '#428619',
          'green-text': '#006400',
          yellow: '#b09000',
          warning: '#ec7e00',
          pink: '#e61e49',
          danger: '#e23b4a',
          'deep-red': '#8b0000',
          brown: '#936d62',
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xxl': ['136px', { lineHeight: '1', letterSpacing: '-2.72px', fontWeight: '500' }],
        'display-xl': ['80px', { lineHeight: '1', letterSpacing: '-0.8px', fontWeight: '500' }],
        'display-lg': ['48px', { lineHeight: '1.21', letterSpacing: '-0.48px', fontWeight: '500' }],
        'display-md': ['40px', { lineHeight: '1.2', letterSpacing: '-0.4px', fontWeight: '500' }],
        'heading-lg': ['32px', { lineHeight: '1.19', letterSpacing: '-0.32px', fontWeight: '500' }],
        'heading-md': ['24px', { lineHeight: '1.33', letterSpacing: '0', fontWeight: '500' }],
        'heading-sm': ['20px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.56', letterSpacing: '-0.09px' }],
        'body-md': ['16px', { lineHeight: '1.5', letterSpacing: '0.24px' }],
        'body-sm': ['14px', { lineHeight: '1.43', letterSpacing: '0' }],
        'button-md': ['16px', { lineHeight: '1.5', letterSpacing: '0.24px', fontWeight: '600' }],
        'button-sm': ['14px', { lineHeight: '1.43', letterSpacing: '0', fontWeight: '600' }],
        caption: ['13px', { lineHeight: '1.4', letterSpacing: '0' }],
      },
      borderRadius: { '2xl': '20px', '3xl': '28px' },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: flutuante,
        xl: flutuante,
        '2xl': flutuante,
        /** Profundidade dos cartoes: uma sombra curta que assenta a borda e uma
         *  longa e bem diluida que afasta o cartao do fundo. */
        cartao: '0 1px 2px rgba(25, 28, 31, 0.04), 0 12px 28px -16px rgba(25, 28, 31, 0.22)',
        'cartao-alto': '0 2px 4px rgba(25, 28, 31, 0.05), 0 22px 44px -20px rgba(25, 28, 31, 0.28)',
        /** Janela flutua acima de tudo: sombra mais aberta e mais funda. */
        janela:
          '0 10px 24px -14px rgba(25, 28, 31, 0.22), 0 40px 80px -32px rgba(25, 28, 31, 0.32)',
      },
      keyframes: {
        surgir: {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        subir: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        revelar: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        /** Curva do iOS: comeca rapido e assenta devagar, sem parecer elastico. */
        surgir: 'surgir 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
        subir: 'subir 0.36s cubic-bezier(0.32, 0.72, 0, 1) both',
        revelar: 'revelar 0.24s ease-out both',
      },
    },
  },
};
