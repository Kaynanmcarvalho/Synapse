import type {
  AcaoDeCredito,
  AvaliacaoDoPedido,
  PedidoDeVenda,
  PermissoesDaDecisao,
} from '@synapse/types';

/** O que quem esta na tela pode fazer com o pedido, decidido antes do clique.
 *
 *  A API confere tudo de novo — esconder ou desabilitar aqui e conveniencia, nao
 *  seguranca. Mas nenhum botao fica ativo para falhar so depois do clique: se a
 *  decisao vai ser recusada por permissao, a tela ja diz por que. */

export const EXIGE_EXCECAO = 'Esta operação exige aprovação excepcional.';
export const SEM_PERMISSAO = 'Você não possui permissão para essa decisão.';
export const SEM_PERMISSAO_DE_DECIDIR = 'Você não possui permissão para decidir crédito.';

export interface CapacidadeDaDecisao {
  /** Aprovar comum ou excepcional — a que o pedido pede. */
  readonly aprovacao: Extract<AcaoDeCredito, 'APROVAR' | 'APROVAR_EXCECAO'>;
  readonly podeAprovar: boolean;
  readonly podeReprovar: boolean;
  /** Por que a aprovacao (ou toda decisao) nao esta disponivel. */
  readonly avisos: readonly string[];
}

export const capacidadeDaDecisao = (
  pedido: Pick<PedidoDeVenda, 'situacao'>,
  avaliacao: Pick<AvaliacaoDoPedido, 'violaPolitica'> | null,
  permissoes: PermissoesDaDecisao,
): CapacidadeDaDecisao => {
  const excecao = avaliacao?.violaPolitica ?? false;
  const aprovacao = excecao ? 'APROVAR_EXCECAO' : 'APROVAR';
  const decidivel = pedido.situacao === 'AGUARDANDO_ANALISE' && avaliacao !== null;
  if (!decidivel) return { aprovacao, podeAprovar: false, podeReprovar: false, avisos: [] };
  if (!permissoes.decidir) {
    return {
      aprovacao,
      podeAprovar: false,
      podeReprovar: false,
      avisos: [SEM_PERMISSAO_DE_DECIDIR],
    };
  }
  if (excecao && !permissoes.aprovarExcecao) {
    return {
      aprovacao,
      podeAprovar: false,
      podeReprovar: true,
      avisos: [EXIGE_EXCECAO, SEM_PERMISSAO],
    };
  }
  return { aprovacao, podeAprovar: true, podeReprovar: true, avisos: [] };
};

/** O mesmo, para o lote da ficha: pedido fora da politica so passa com a
 *  permissao de excecao. Sem ela, o botao explica e sugere desmarcar. */
export const avisosDoLote = (
  quantos: number,
  excepcionais: number,
  permissoes: PermissoesDaDecisao,
): readonly string[] => {
  if (quantos === 0) return [];
  if (!permissoes.decidir) return [SEM_PERMISSAO_DE_DECIDIR];
  if (excepcionais > 0 && !permissoes.aprovarExcecao) {
    return [
      EXIGE_EXCECAO,
      SEM_PERMISSAO,
      `Desmarque ${excepcionais === 1 ? 'o pedido fora da política' : `os ${excepcionais} pedidos fora da política`} para aprovar os demais.`,
    ];
  }
  return [];
};
