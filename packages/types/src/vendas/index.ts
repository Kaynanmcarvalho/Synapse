/** O documento que o Ponto de Vendas e o PDV Balcão imprimem: o "PEDIDO DE
 *  VENDA (SEM VALOR FISCAL)" do Syndata. Montado na API, a tela só desenha. */

export interface EmpresaDaImpressao {
  readonly nome: string;
  readonly razaoSocial: string;
  readonly documento: string;
  readonly inscricaoEstadual: string | null;
  readonly endereco: string;
  readonly cidadeUf: string;
  readonly cep: string;
  readonly telefone: string | null;
  readonly logoUrl: string | null;
}

export interface ItemDaImpressao {
  readonly codigo: string;
  readonly descricao: string;
  /** Milésimos. */
  readonly quantidade: number;
  readonly unidade: string;
  /** Peso da linha (quantidade × peso da unidade), em kg. */
  readonly pesoKg: number;
  readonly valorUnitarioCentavos: number;
  readonly descontoCentavos: number;
  readonly valorTotalCentavos: number;
  readonly lote: string | null;
}

export interface ClienteDaImpressao {
  readonly codigo: string | null;
  readonly nome: string;
  readonly fantasia: string | null;
  readonly endereco: string;
  readonly documento: string | null;
  readonly inscricaoEstadual: string | null;
  readonly telefone: string | null;
}

export interface ImpressaoDoPedido {
  readonly titulo: string;
  readonly numero: number;
  readonly emitidoEm: string;
  readonly situacao: string;
  readonly empresa: EmpresaDaImpressao;
  readonly vendedor: string;
  readonly assessor: string | null;
  readonly cliente: ClienteDaImpressao;
  readonly pagamentos: readonly { readonly descricao: string; readonly valorCentavos: number }[];
  readonly condicaoDePagamento: string;
  readonly itens: readonly ItemDaImpressao[];
  readonly totalBrutoCentavos: number;
  readonly freteCentavos: number;
  readonly acrescimosCentavos: number;
  readonly descontosCentavos: number;
  readonly pesoTotalKg: number;
  readonly totalLiquidoCentavos: number;
  readonly observacao: string | null;
}
