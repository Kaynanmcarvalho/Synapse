/** A linguagem visual dos primitives, num lugar so.
 *
 *  Input, Select e Button precisam concordar em altura, raio, borda e foco —
 *  quando cada um decide por conta, o formulario vira colagem. Tudo aqui sai de
 *  token: nenhuma medida solta.
 *
 *  Os valores dos VALORES estao em `tokens/`; aqui ficam as CLASSES que os
 *  traduzem para o Tailwind. */

/** Densidade de controle. ERP de mesa vive em `padrao` (36px); `compacta` e para
 *  barra de ferramentas e linha de tabela; `confortavel`, para formulario longo
 *  ou toque. Nao e para usar 44px em tudo. */
export type Densidade = 'compacta' | 'padrao' | 'confortavel';

export const ALTURA: Readonly<Record<Densidade, string>> = {
  compacta: 'h-controle-compacta',
  padrao: 'h-controle-padrao',
  confortavel: 'h-controle-confortavel',
};

export const RECUO_LATERAL: Readonly<Record<Densidade, string>> = {
  compacta: 'px-2.5',
  padrao: 'px-3',
  confortavel: 'px-3.5',
};

/** Tamanho do glifo por densidade. Icone que cresce sozinho tira o texto do
 *  centro otico da linha. */
export const TAMANHO_DE_ICONE: Readonly<Record<Densidade, number>> = {
  compacta: 14,
  padrao: 16,
  confortavel: 18,
};

/** O foco do Synapse: a borda vira cobalto e um halo curto de 2px aparece por
 *  fora. Sem anel grosso de biblioteca, sem outline padrao do navegador. */
export const FOCO_DE_CONTROLE =
  'focus:border-primary focus:bg-surface-painel focus:ring-2 focus:ring-primary/30';

export const FOCO_DE_ACAO =
  'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-pagina';

/** Campo em repouso: superficie levemente afundada dentro do painel branco,
 *  linha fina, sem sombra. */
const CONTROLE_EM_REPOUSO =
  'border-line-fina bg-surface-afundada hover:border-faint disabled:hover:border-line-fina';

/** Campo com aviso: a borda e o fundo mudam juntos, sem caixa vermelha. */
const CONTROLE_COM_AVISO =
  'border-status-perigo bg-status-vencido-fundo hover:border-status-perigo focus:border-status-perigo focus:ring-status-perigo/25';

const CONTROLE_DESABILITADO =
  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-suave disabled:text-ink-desabilitado';

export const classeDeControle = (densidade: Densidade, invalido: boolean): string =>
  [
    'w-full rounded-controle border text-body-sm text-ink outline-none',
    'transition-colors duration-rapido ease-padrao placeholder:text-ink-sutil',
    ALTURA[densidade],
    RECUO_LATERAL[densidade],
    FOCO_DE_CONTROLE,
    invalido ? CONTROLE_COM_AVISO : CONTROLE_EM_REPOUSO,
    CONTROLE_DESABILITADO,
  ].join(' ');
