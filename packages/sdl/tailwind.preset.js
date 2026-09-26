/** Synapse Design Language — tema do Tailwind.
 *
 *  Uma fonte de verdade: o tema abaixo e montado a partir de `tokens/`, e nao
 *  escrito a mao. Quem muda um valor muda no token, num lugar so.
 *
 *  Esta fase e deliberadamente aditiva. Todo nome que o ERP ja usa continua com
 *  o mesmo valor (`text-ink`, `bg-surface-soft`, `border-hairline-light`,
 *  `shadow-cartao`, a escala de texto inteira); ao lado deles entram os nomes
 *  semanticos do SDL (`bg-surface-painel`, `text-status-perigo`, `z-dialogo`,
 *  `duration-rapido`), que as telas passam a adotar nas fases seguintes.
 *
 *  Nenhuma tela muda de aparencia por causa deste arquivo. */

import {
  acento,
  camada,
  cobalto,
  curva,
  duracao,
  externo,
  fonte,
  neutro,
  raio,
  sombra,
  superficie as superficieCru,
  texto,
} from './tokens/primitivos.js';
import {
  conteudo,
  corDaMarca,
  densidade,
  estado,
  largura,
  linha,
  marca,
  superficie,
} from './tokens/semanticos.js';

/** `{ ok: {texto, fundo, borda, indicador} }` vira `{ ok: { DEFAULT, fundo, ... } }`:
 *  `text-status-ok` pega o texto, `bg-status-ok-fundo` pega o fundo. */
const paletaDeEstado = Object.fromEntries(
  Object.entries(estado).map(([nome, tons]) => [
    nome,
    {
      DEFAULT: tons.texto,
      texto: tons.texto,
      fundo: tons.fundo,
      borda: tons.borda,
      indicador: tons.indicador,
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
export default {
  /** Continua em `class` enquanto restar `dark:` no conteudo escaneado
   *  (packages/ui ainda tem). Em `media`, essas variantes voltariam a valer
   *  sozinhas no sistema escuro do usuario — regressao silenciosa. */
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // --- nomes que o ERP ja usa, com os mesmos valores de sempre
        slate: neutro,
        blue: cobalto,
        brand: cobalto,
        primary: {
          DEFAULT: corDaMarca(),
          bright: marca.brilhante,
          deep: marca.profunda,
          on: marca.sobre,
        },
        canvas: { light: superficieCru.branco, dark: superficieCru.preto },
        surface: {
          soft: superficie.suave,
          suave: superficie.suave,
          card: superficie.painel,
          deep: superficieCru.escuroProfundo,
          elevated: superficieCru.escuroElevado,
          // --- camada semantica nova
          pagina: superficie.pagina,
          painel: superficie.painel,
          elevada: superficie.elevado,
          afundada: superficie.afundado,
          hover: superficie.hover,
          pressionada: superficie.pressionado,
          inversa: superficie.inversa,
        },
        hairline: { light: linha.fina, strong: linha.forte },
        ink: {
          DEFAULT: conteudo.forte,
          forte: conteudo.forte,
          padrao: conteudo.padrao,
          medio: conteudo.medio,
          apoio: conteudo.apoio,
          fraco: conteudo.fraco,
          sutil: conteudo.sutil,
          desabilitado: conteudo.desabilitado,
          inverso: conteudo.inverso,
        },
        body: conteudo.padrao,
        charcoal: conteudo.medio,
        mute: conteudo.apoio,
        ash: conteudo.fraco,
        stone: conteudo.sutil,
        faint: conteudo.desabilitado,
        accent: acento,
        // --- camada semantica nova
        line: { DEFAULT: linha.fina, fina: linha.fina, media: linha.media, forte: linha.forte },
        status: paletaDeEstado,
        externo,
      },
      fontFamily: {
        sans: fonte.ui,
        display: fonte.display,
        /** Numero, documento, SKU e chave de NF-e: mesma familia, algarismos de
         *  largura fixa ligados. A escolha de uma familia propria fica para
         *  quando o SDL tiver os primitivos de texto. */
        data: [...fonte.dado, { fontFeatureSettings: '"tnum" 1, "ss01" 1' }],
        code: fonte.codigo,
      },
      fontSize: texto,
      borderRadius: {
        '2xl': '20px',
        '3xl': '28px',
        // --- escala do SDL: quanto maior a superficie, maior o raio
        minimo: raio.minimo,
        pequeno: raio.pequeno,
        controle: raio.controle,
        painel: raio.painel,
        janela: raio.janela,
      },
      borderWidth: { fina: '1px', media: '2px', grossa: '3px' },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: sombra.menu,
        xl: sombra.menu,
        '2xl': sombra.menu,
        cartao: sombra.cartao,
        'cartao-alto': sombra.cartaoAlto,
        janela: sombra.janela,
        // --- nome semantico para o mesmo desenho de sombra do menu
        menu: sombra.menu,
        'menu-contido': sombra.menuContido,
      },
      zIndex: Object.fromEntries(
        Object.entries(camada).map(([nome, valor]) => [nome, String(valor)]),
      ),
      transitionDuration: Object.fromEntries(Object.entries(duracao).map(([n, v]) => [n, v])),
      transitionTimingFunction: curva,
      maxWidth: Object.fromEntries(
        Object.entries(largura).map(([nome, valor]) => [`conteudo-${nome}`, valor]),
      ),
      spacing: Object.fromEntries(
        Object.entries(densidade).flatMap(([nome, medidas]) => [
          [`controle-${nome}`, medidas.controle],
          [`linha-${nome}`, medidas.linha],
        ]),
      ),
      keyframes: {
        // sobreposicoes (Modal/Drawer do @synapse/ui)
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
        // entradas curtas do ERP
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
        'backdrop-in': 'backdrop-in .2s ease-out both',
        'backdrop-out': 'backdrop-out .18s ease-in both',
        'modal-in': 'modal-in .26s cubic-bezier(.32,.72,0,1) both',
        'modal-out': 'modal-out .18s ease-in both',
        'sheet-in-right': 'sheet-in-right .3s cubic-bezier(.32,.72,0,1) both',
        'sheet-out-right': 'sheet-out-right .2s cubic-bezier(.4,0,1,1) both',
        'sheet-in-bottom': 'sheet-in-bottom .3s cubic-bezier(.32,.72,0,1) both',
        'sheet-out-bottom': 'sheet-out-bottom .2s cubic-bezier(.4,0,1,1) both',
        /** Curva do iOS: comeca rapido e assenta devagar, sem parecer elastico. */
        surgir: 'surgir 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
        subir: 'subir 0.36s cubic-bezier(0.32, 0.72, 0, 1) both',
        revelar: 'revelar 0.24s ease-out both',
      },
    },
  },
  plugins: [],
};
