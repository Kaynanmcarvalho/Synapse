import type { AtalhoDaBarra } from '../comum/BarraDeAtalhos';
import type { AcaoDaGrade } from '../comum/BotoesDaGrade';
import type { MapaDeAtalhos } from '../comum/useAtalhosDaTela';
import type { JanelaDoPdv } from './JanelasDoPdv';

/** As teclas do PDV, na ordem da barra do Nutri Prime. A mesma lista desenha os
 *  botões e liga as teclas: o que aparece na barra é o que a tecla faz. */

export interface ComandosDoPdv {
  readonly abrir: (janela: JanelaDoPdv) => void;
  readonly limparVenda: () => void;
  readonly finalizar: () => void;
  readonly gaveta: () => void;
  readonly focarQuantidade: () => void;
}

export const barraDoPdv = (comandos: ComandosDoPdv, temItens: boolean): AtalhoDaBarra[] => [
  { tecla: 'Ctrl+X', rotulo: 'Limpar Venda', acao: comandos.limparVenda },
  {
    tecla: 'Ctrl+D',
    rotulo: 'Cancelar Venda',
    acao: () => comandos.abrir({ tipo: 'vendas', uso: 'cancelar' }),
  },
  {
    tecla: 'F8',
    rotulo: 'Consultar NF',
    acao: () => comandos.abrir({ tipo: 'vendas', uso: 'nf' }),
  },
  {
    tecla: 'Ctrl+H',
    rotulo: 'Histórico de Vendas',
    acao: () => comandos.abrir({ tipo: 'vendas', uso: 'historico' }),
  },
  { tecla: 'F7', rotulo: 'Produto Pesável', acao: () => comandos.abrir({ tipo: 'pesavel' }) },
  { tecla: 'Ctrl+A', rotulo: 'Outros Recursos', acao: () => comandos.abrir({ tipo: 'outros' }) },
  { tecla: 'Alt+N', rotulo: 'Mesa/Cartão', acao: () => comandos.abrir({ tipo: 'mesa' }) },
  { tecla: 'F10', rotulo: 'Informar Cliente', acao: () => comandos.abrir({ tipo: 'cliente' }) },
  { tecla: 'F4', rotulo: 'Acionar Gaveta', acao: comandos.gaveta },
  {
    tecla: 'F3',
    rotulo: 'Finalizar Venda',
    acao: comandos.finalizar,
    principal: true,
    desabilitado: !temItens,
  },
];

export const teclasDoPdv = (
  barra: readonly AtalhoDaBarra[],
  comandos: ComandosDoPdv,
): MapaDeAtalhos => ({
  ...Object.fromEntries(barra.map((atalho) => [atalho.tecla, atalho.acao])),
  F2: comandos.focarQuantidade,
  F12: () => comandos.abrir({ tipo: 'produtos', lista: { tipo: 'busca', termo: '' } }),
});

/** Os botões sobre o item escolhido, na ordem do PDV do Nutri Prime. */
export const ACOES_DA_GRADE: readonly AcaoDaGrade[] = [
  'alterar',
  'excluir',
  'copiar',
  'desconto',
  'produto',
  'sugestao',
  'similar',
  'lote',
  'serie',
];
