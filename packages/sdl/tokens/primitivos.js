/** Synapse Design Language — primitivos.
 *
 *  Os valores crus do sistema: paleta fisica, escalas e curvas. Tela nenhuma
 *  deve consumir daqui; quem fala com a interface e `semanticos.js`, que da
 *  funcao a cada valor. Isto aqui e o estoque de tinta, nao a pintura.
 *
 *  Toda a paleta abaixo e exatamente a que o ERP ja renderiza hoje (extraida de
 *  apps/web-erp/tailwind.config.cjs e de packages/ui/tailwind.preset.js): esta
 *  fase move a decisao de lugar, sem mudar cor nenhuma na tela. */

/** Neutros quentes da retaguarda. `900` e o preto de texto; `50` e a superficie
 *  cinza que separa cartao de fundo. */
export const neutro = {
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

/** Cobalto: o unico carimbo da marca Synapse. */
export const cobalto = {
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

/** Azul que o preset do @synapse/ui publica desde antes do SDL. Continua aqui
 *  porque web-admin e web-vendedor ainda o renderizam: trocar por cobalto
 *  mudaria a aparencia daqueles apps, o que nao e assunto desta fase. */
export const azulLegado = {
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
};

/** Acentos de dado (graficos, selos de dominio). Vieram do tema atual. */
export const acento = {
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
};

/** Cores de estado, hoje escritas a mao em 165 lugares do web-erp. O inventario
 *  que deu origem a esta lista esta no README do pacote. */
export const estado = {
  perigoTexto: '#b3242f',
  perigoTextoForte: '#931d27',
  perigoFundo: '#fdeced',
  perigoFundoSuave: '#fff8f8',
  perigoBorda: '#ff8a95',
  atencaoTexto: '#8a4b00',
  atencaoFundo: '#fff3e0',
  atencaoFundoSuave: '#fff4e5',
  okTexto: '#00664d',
  okFundo: '#e6f6f1',
  okIndicador: '#00a37a',
  okIndicadorSuave: '#5fe0bd',
  marcaFundoSuave: '#eef0ff',
};

/** Superficies de interacao: os cinzas de hover e de campo afundado. */
export const superficie = {
  branco: '#ffffff',
  preto: '#000000',
  cinza: '#f4f4f4',
  cinzaHover: '#ececee',
  cinzaPressionado: '#e9e9ec',
  cinzaBorda: '#e6e6e6',
  quaseBranco: '#fcfcfd',
  quaseBrancoFrio: '#fafafa',
  quaseBrancoMorno: '#f6f6f7',
  escuroProfundo: '#0a0a0a',
  escuroElevado: '#16181a',
};

/** Marcas de terceiros. Cor de marca nao se ajusta ao tema: o verde do WhatsApp
 *  e o verde do WhatsApp. */
export const externo = {
  whatsapp: '#25d366',
};

/** Grade de 4px. As chaves batem com a escala do Tailwind (1 = 4px). */
export const espaco = {
  0: '0px',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

/** Raios. O ERP futuro usa raio curto: quanto maior a superficie, maior o raio,
 *  e nunca o contrario. `pilula` fica para botao e selo, nao para painel. */
export const raio = {
  nenhum: '0px',
  minimo: '4px',
  pequeno: '6px',
  controle: '10px',
  painel: '14px',
  janela: '20px',
  pilula: '9999px',
};

export const borda = {
  fina: '1px',
  media: '2px',
  grossa: '3px',
};

/** Sombra so para o que flutua de verdade. Linha antes de sombra. */
export const sombra = {
  nenhuma: 'none',
  cartao: '0 1px 2px rgba(25, 28, 31, 0.04), 0 12px 28px -16px rgba(25, 28, 31, 0.22)',
  cartaoAlto: '0 2px 4px rgba(25, 28, 31, 0.05), 0 22px 44px -20px rgba(25, 28, 31, 0.28)',
  menu: '0 12px 32px -8px rgba(25, 28, 31, 0.14)',
  /** Sombra curta para menu de software (Fase 3 do chrome): perto da borda, sem
   *  o halo difuso do `menu`. Nao troca o token acima porque `shadow-lg/xl/2xl`
   *  em telas fora do chrome ainda apontam para ele. */
  menuContido: '0 4px 10px -4px rgba(25, 28, 31, 0.22), 0 1px 2px rgba(25, 28, 31, 0.08)',
  janela: '0 10px 24px -14px rgba(25, 28, 31, 0.22), 0 40px 80px -32px rgba(25, 28, 31, 0.32)',
};

/** Camadas. Os numeros sobem de 10 em 10 para caber vizinho novo sem renumerar
 *  o resto. O mapa do que o ERP usa hoje esta no README. */
export const camada = {
  base: 0,
  conteudo: 10,
  fixo: 30,
  suspenso: 40,
  flutuante: 50,
  sobreposicao: 60,
  dialogo: 70,
  janela: 80,
  comando: 90,
  aviso: 100,
};

/** Tempo curto e curva firme: software de trabalho, nao vitrine. Nada acima de
 *  240ms, e a maior parte abaixo de 180ms. */
export const duracao = {
  instantaneo: '80ms',
  rapido: '120ms',
  normal: '180ms',
  lento: '240ms',
};

export const curva = {
  padrao: 'cubic-bezier(0.2, 0, 0, 1)',
  entrada: 'cubic-bezier(0.32, 0.72, 0, 1)',
  saida: 'cubic-bezier(0.4, 0, 1, 1)',
};

/** Familias. `dado` existe para numero, documento e codigo: por enquanto e a
 *  mesma Inter, com os algarismos de largura fixa ligados. Trocar de familia e
 *  decisao de outra fase. */
const PILHA_UI = [
  '"Inter Variable"',
  'Inter',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'sans-serif',
];

export const fonte = {
  ui: PILHA_UI,
  display: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
  dado: PILHA_UI,
  codigo: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
};

/** Escala tipografica que o ERP ja renderiza. Formato do Tailwind:
 *  [tamanho, { lineHeight, letterSpacing, fontWeight }]. */
export const texto = {
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
};
