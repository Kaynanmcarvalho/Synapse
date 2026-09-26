import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Junta classes condicionais e resolve conflito do Tailwind: a ultima
 *  utilitaria do mesmo grupo vence. E o que deixa o consumidor ajustar um
 *  primitive (`className="w-40"`) sem brigar com o estilo de dentro.
 *
 *  O `tailwind-merge` precisa aprender o vocabulario do SDL. Sem isto ele le
 *  `text-heading-lg` como cor de texto — nao e tamanho conhecido dele —, entende
 *  que `text-ink` vem depois e **apaga o tamanho da fonte**. O mesmo valeria
 *  para `text-body-sm` dentro do Input. Os nomes abaixo espelham os tokens de
 *  `tokens/primitivos.js`; valor nenhum e repetido, so o nome. */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-xxl',
            'display-xl',
            'display-lg',
            'display-md',
            'heading-lg',
            'heading-md',
            'heading-sm',
            'body-lg',
            'body-md',
            'body-sm',
            'button-md',
            'button-sm',
            'caption',
          ],
        },
      ],
      rounded: [{ rounded: ['minimo', 'pequeno', 'controle', 'painel', 'janela'] }],
      h: [{ h: ['controle-compacta', 'controle-padrao', 'controle-confortavel'] }],
      w: [{ w: ['controle-compacta', 'controle-padrao', 'controle-confortavel'] }],
      duration: [{ duration: ['instantaneo', 'rapido', 'normal', 'lento'] }],
      ease: [{ ease: ['padrao', 'entrada', 'saida'] }],
      'max-w': [
        {
          'max-w': [
            'conteudo-estreita',
            'conteudo-leitura',
            'conteudo-padrao',
            'conteudo-trabalho',
            'conteudo-ampla',
            'conteudo-cheia',
          ],
        },
      ],
    },
  },
});

export const cn = (...entradas: ClassValue[]): string => merge(clsx(entradas));
