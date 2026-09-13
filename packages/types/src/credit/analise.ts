import type { Address, CustomerType, FinancialStatus } from '../catalog';
import type { CustomerId } from '../common';
import type { PedidoDeVenda, ResumoFinanceiroDoCliente, SituacaoDoPedido } from './pedido';

// ── Exposicao ────────────────────────────────────────────────────────────────

/** Como o pedido vai ser pago, do ponto de vista do risco. E isso — e nao o
 *  valor do pedido — que diz quanto do limite do cliente ele consome. */
export type NaturezaDaCobranca =
  /** Bonificacao, troca, amostra, devolucao ou condicao "sem cobranca". */
  | 'SEM_COBRANCA'
  /** PIX ou dinheiro a vista: o dinheiro entra antes da mercadoria sair. */
  | 'IMEDIATA'
  /** Cartao: quem deve e a operadora, nao o cliente. */
  | 'CARTAO'
  /** Boleto, cheque, carteira: o cliente leva agora e paga depois. */
  | 'A_PRAZO'
  /** Mercadoria entregue em consignacao: fica em poder do cliente. */
  | 'CONSIGNACAO';

export interface ExposicaoDoPedido {
  /** O valor da operacao, o que aparece no pedido. */
  readonly valorComercialCentavos: number;
  readonly entradaCentavos: number;
  /** Valor comercial menos a entrada: o que fica para depois. */
  readonly financiadoCentavos: number;
  /** Credito concedido ao cliente: o que ele vai pagar depois (a prazo). */
  readonly exposicaoCreditoCentavos: number;
  /** Mercadoria consignada: risco economico sem titulo a receber ainda. Nesta
   *  versao compromete o limite por inteiro (regra conservadora e provisoria). */
  readonly exposicaoConsignacaoCentavos: number;
  /** Total consolidado (credito + consignacao): o que compromete o limite. */
  readonly exposicaoCentavos: number;
  readonly natureza: NaturezaDaCobranca;
  /** Compromete limite. NAO significa que o pagamento foi confirmado quando e
   *  falso: o pedido nao guarda recebimento de PIX nem autorizacao de cartao. */
  readonly consomeLimite: boolean;
  /** Por que a exposicao ficou nesse valor, em uma frase. */
  readonly explicacao: string;
}

// ── Motivos da analise ───────────────────────────────────────────────────────

export type CodigoDoMotivo =
  | 'CLIENTE_BLOQUEADO'
  | 'TITULO_VENCIDO'
  | 'SALDO_VENCIDO_ACIMA_DO_LIMITE'
  | 'SEM_LIMITE_DE_CREDITO'
  | 'LIMITE_EXCEDIDO'
  | 'LIMITE_INSUFICIENTE'
  | 'CADASTRO_INCOMPLETO'
  | 'SEM_HISTORICO_DE_CREDITO'
  | 'HISTORICO_INSUFICIENTE'
  | 'ANALISE_OBRIGATORIA';

export interface MotivoDaAnalise {
  readonly codigo: CodigoDoMotivo;
  /** "Limite insuficiente". */
  readonly rotulo: string;
  /** A evidencia: "Exposição de R$ 5.000,00 para R$ 1.200,00 disponíveis". */
  readonly detalhe: string;
  /** Fere a politica de credito: aprovar exige justificativa. Motivo que nao
   *  fere e alerta — informa, mas nao impede. */
  readonly violaPolitica: boolean;
}

export interface RegistroDaAvaliacao {
  readonly avaliadaEm: string;
  readonly motivos: readonly MotivoDaAnalise[];
}

// ── Situacao de credito do cliente ───────────────────────────────────────────

export interface ParametrosDaAnalise {
  /** Abaixo disto o historico de pagamento e "insuficiente" e a tela nao tira
   *  conclusao de pontualidade. */
  readonly minimoDeTitulosLiquidados: number;
  /** Minimo de pedidos para comparar ticket e prazo com o habitual. */
  readonly minimoDePedidosParaComparar: number;
  /** Atraso tolerado antes de bloquear (boleto compensa em D+1). */
  readonly toleranciaDeAtrasoDias: number;
  /** Utilizacao do limite a partir da qual a tela chama atencao. */
  readonly utilizacaoDeAtencaoPercentual: number;
}

export interface CadastroResumido {
  readonly existe: boolean;
  /** Campos obrigatorios para faturar que estao vazios. */
  readonly faltando: readonly string[];
}

/** O retrato de credito do cliente num instante: e a base de todo calculo de
 *  impacto, e vem pronto da API para a tela nao refazer a conta. */
export interface SituacaoDeCredito {
  /** null: sem cadastro; 0: cadastro sem limite concedido. */
  readonly limiteCentavos: number | null;
  /** Saldo dos titulos a receber que ainda contam (nao cancelados nem renegociados). */
  readonly emAbertoCentavos: number;
  readonly vencidoCentavos: number;
  readonly aVencerCentavos: number;
  /** Exposicao dos pedidos ja aprovados que ainda nao viraram titulo. */
  readonly aprovadosNaoFaturadosCentavos: number;
  /** Em aberto + aprovados nao faturados: o que ja esta tomado do limite. */
  readonly comprometidoCentavos: number;
  /** Limite - comprometido. null quando nao ha limite cadastrado. */
  readonly disponivelCentavos: number | null;
  readonly titulosVencidos: number;
  readonly diasDeAtrasoMaximo: number;
  /** Cadastro com situacao financeira BLOCKED. */
  readonly bloqueado: boolean;
  /** A regra de inadimplencia do financeiro (atraso acima da tolerancia). */
  readonly inadimplencia: {
    readonly bloqueia: boolean;
    readonly motivo: 'ATRASO' | 'LIMITE_DE_SALDO_VENCIDO' | null;
    readonly mensagem: string | null;
  };
  readonly cadastro: CadastroResumido;
  /** Titulos ja liquidados (quitados) de toda a historia do cliente. */
  readonly titulosLiquidados: number;
  /** Se o cliente ja teve algum titulo — primeira compra a prazo, se nao. */
  readonly possuiTitulos: boolean;
  readonly calculadoEm: string;
}

// ── Comportamento financeiro ─────────────────────────────────────────────────

export type JanelaDeTempo = '90D' | '6M' | '12M';

export interface PontualidadeNaJanela {
  /** Titulos quitados na janela (pela data em que o saldo zerou). */
  readonly titulosLiquidados: number;
  readonly antecipados: number;
  readonly noVencimento: number;
  readonly emAtraso: number;
  /** (antecipados + no vencimento) / liquidados, 0-100. null sem titulo. */
  readonly percentualNoPrazo: number | null;
  /** Media de dias apos o vencimento, contando pagamento em dia como zero. */
  readonly atrasoMedioDias: number | null;
  readonly maiorAtrasoDias: number | null;
  /** Soma das liquidacoes lancadas na janela. */
  readonly pagoCentavos: number;
}

export interface ComprasNaJanela {
  /** Vendas aprovadas ou faturadas na janela (bonificacao e troca nao contam). */
  readonly pedidos: number;
  readonly valorCentavos: number;
  readonly ticketMedioCentavos: number | null;
  /** Media simples do prazo medio dos pedidos a prazo da janela. */
  readonly prazoMedioDias: number | null;
  readonly pedidosAPrazo: number;
}

export interface AtrasoRegistrado {
  readonly tituloId: string;
  readonly identificacao: string;
  readonly vencimento: string;
  readonly pagoEm: string;
  readonly dias: number;
}

export interface ComportamentoFinanceiro {
  readonly janelas: Readonly<
    Record<
      JanelaDeTempo,
      { readonly pontualidade: PontualidadeNaJanela; readonly compras: ComprasNaJanela }
    >
  >;
  /** Titulos quitados de toda a historia: a amostra que sustenta as conclusoes. */
  readonly titulosConsiderados: number;
  readonly historicoSuficiente: boolean;
  readonly ultimoAtraso: AtrasoRegistrado | null;
  readonly ultimaCompraEm: string | null;
  /** Maior saldo em aberto ja registrado, reconstituido pelos titulos. */
  readonly maiorExposicaoHistoricaCentavos: number | null;
}

// ── Sinais e avaliacao do pedido ─────────────────────────────────────────────

export type TomDoSinal = 'positivo' | 'neutro' | 'atencao' | 'critico';

/** Uma evidencia organizada, nunca uma decisao: "8 dos últimos 8 títulos pagos
 *  no prazo". Sai de regra deterministica, com a fonte do dado. */
export interface SinalDeDecisao {
  readonly id: string;
  readonly tom: TomDoSinal;
  readonly texto: string;
  /** De onde veio a informacao: "Títulos a receber", "Pedidos faturados". */
  readonly fonte: string;
}

export interface ImpactoDaAprovacao {
  readonly limiteCentavos: number | null;
  readonly comprometidoAntesCentavos: number;
  readonly disponivelAntesCentavos: number | null;
  readonly valorComercialCentavos: number;
  readonly exposicaoCentavos: number;
  readonly comprometidoDepoisCentavos: number;
  readonly disponivelDepoisCentavos: number | null;
  /** Comprometido / limite, 0-100 (pode passar de 100). null sem limite. */
  readonly utilizacaoAntesPercentual: number | null;
  readonly utilizacaoDepoisPercentual: number | null;
  readonly consomeLimite: boolean;
}

/** O pedido de hoje contra o que o cliente costuma fazer. So compara quando ha
 *  amostra: sem ela, os campos voltam nulos e a tela diz por que. */
export interface ComparacaoComHistorico {
  /** So venda se compara com compras: bonificacao, troca e amostra nao. */
  readonly aplicavel: boolean;
  /** Compras dos ultimos 90 dias que formam o ticket medio. */
  readonly pedidosNoTicket: number;
  /** Compras a prazo dos ultimos 12 meses que formam o prazo habitual. */
  readonly pedidosNoPrazo: number;
  /** Ha amostra para ao menos uma das duas comparacoes. */
  readonly amostraSuficiente: boolean;
  /** Ticket medio das compras dos ultimos 90 dias; null sem amostra. */
  readonly ticketMedioCentavos: number | null;
  /** Valor deste pedido / ticket medio: 2.4 = 2,4 vezes. */
  readonly razaoSobreTicket: number | null;
  /** Prazo medio das compras a prazo dos ultimos 12 meses. */
  readonly prazoMedioHistoricoDias: number | null;
  /** Prazo deste pedido - prazo habitual. */
  readonly diferencaDePrazoDias: number | null;
}

export interface AvaliacaoDoPedido {
  readonly pedidoId: string;
  readonly exposicao: ExposicaoDoPedido;
  readonly motivos: readonly MotivoDaAnalise[];
  readonly violaPolitica: boolean;
  readonly impacto: ImpactoDaAprovacao;
  readonly comparacao: ComparacaoComHistorico;
  readonly sinais: readonly SinalDeDecisao[];
}

/** O que a fila precisa da avaliacao: exposicao e motivos, sem o comportamento
 *  (que so a ficha do cliente carrega). */
export interface ResumoDaAvaliacao {
  readonly exposicao: ExposicaoDoPedido;
  readonly motivos: readonly MotivoDaAnalise[];
  readonly violaPolitica: boolean;
}

export interface PedidoNaFila {
  readonly pedido: PedidoDeVenda;
  readonly cliente: ResumoFinanceiroDoCliente;
  /** Se quem esta pedindo a fila ja imprimiu este pedido. */
  readonly impresso: boolean;
  readonly avaliacao: ResumoDaAvaliacao;
}

export interface TituloEmAberto {
  readonly id: string;
  /** Pedido que gerou o titulo, quando houver — e por ele que a lupa abre. */
  readonly pedidoId: string | null;
  readonly numero: string;
  readonly serie: string;
  /** "2/3": a mesma nota gera varias parcelas, e o cliente cobra pela parcela. */
  readonly parcela: string;
  readonly vencimento: string;
  readonly valorCentavos: number;
  readonly saldoCentavos: number;
  /** Dias de atraso; 0 quando ainda nao venceu. */
  readonly diasDeAtraso: number;
}

export interface PagamentoDoCliente {
  readonly tituloId: string;
  readonly pedidoId: string | null;
  readonly numero: string;
  readonly serie: string;
  readonly parcela: string;
  readonly vencimento: string;
  readonly pagoEm: string;
  readonly valorCentavos: number;
  /** 0 pagou no dia do vencimento; negativo pagou adiantado; positivo, atrasado. */
  readonly diasDoPagamento: number;
}

export interface NotaDoCliente {
  readonly pedidoId: string;
  /** Numero do pedido que gerou a nota. */
  readonly pedidoNumero?: number;
  /** Situacao do pedido de origem: cancelado aparece como cancelado. */
  readonly pedidoSituacao?: SituacaoDoPedido;
  readonly numero: number;
  readonly serie: number;
  readonly chaveDeAcesso: string | null;
  readonly emitidaEm: string;
  readonly totalCentavos: number;
}

export interface CarteiraDoCliente {
  readonly titulosEmAberto: readonly TituloEmAberto[];
  readonly totalVencidoCentavos: number;
  readonly totalAVencerCentavos: number;
  readonly pagamentos: readonly PagamentoDoCliente[];
  readonly totalPagoCentavos: number;
}

export interface ClienteDaAnalise {
  readonly id: CustomerId;
  readonly nome: string;
  readonly documento: string | null;
  /** Codigo interno do cadastro, quando existe. */
  readonly codigo?: string | null;
  readonly cidade?: string | null;
  readonly bairro?: string | null;
}

export interface PainelDeAnaliseDeCredito {
  readonly cliente: ClienteDaAnalise;
  readonly pedidosEmAnalise: readonly PedidoDeVenda[];
  readonly totalEmAnaliseCentavos: number;
  readonly ultimosPedidos: readonly PedidoDeVenda[];
  readonly ultimasNotas: readonly NotaDoCliente[];
  readonly carteira: CarteiraDoCliente;
  readonly situacao: SituacaoDeCredito;
  readonly comportamento: ComportamentoFinanceiro;
  /** Uma por pedido em analise, na mesma ordem. */
  readonly avaliacoes: readonly AvaliacaoDoPedido[];
  readonly parametros: ParametrosDaAnalise;
  readonly cadastro: CadastroDoCliente | null;
  /** O que quem pediu a ficha pode decidir, resolvido pela API com as
   *  permissoes do usuario — a tela so reflete, a API confere de novo. */
  readonly permissoes: PermissoesDaDecisao;
}

export interface PermissoesDaDecisao {
  /** Aprovar dentro da politica e reprovar (financeiro.editar). */
  readonly decidir: boolean;
  /** Aprovar fora da politica, com justificativa (financeiro.credito.aprovarExcecao). */
  readonly aprovarExcecao: boolean;
}

/** Resultado da liberacao em lote: o que passou e o que ficou, com o motivo. */
export interface ResultadoDaLiberacao {
  readonly liberados: readonly string[];
  /** Os que passaram por aprovacao excepcional, dentro de `liberados`. */
  readonly excepcionais?: readonly string[];
  readonly recusados: readonly { readonly pedidoId: string; readonly motivo: string }[];
}

export type AcaoDeCredito = 'APROVAR' | 'APROVAR_EXCECAO' | 'REPROVAR';

export interface DecisaoDeCreditoInput {
  readonly acao: AcaoDeCredito;
  readonly justificativa?: string | null;
}

export interface ResultadoDaDecisao {
  readonly pedido: PedidoDeVenda;
  readonly avaliacao: AvaliacaoDoPedido;
}

/** O cadastro do cliente que o credito le e corrige. Os campos tem os mesmos
 *  nomes do `Customer` do catalogo: e o mesmo registro, visto pelo credito. */
export interface CadastroDoCliente {
  readonly id: CustomerId;
  /** Codigo interno do cliente, o que a operacao usa no telefone. */
  readonly codigo?: string | null;
  readonly type: CustomerType;
  readonly name: string;
  readonly legalName: string | null;
  readonly taxId: string;
  readonly stateRegistration: string | null;
  readonly phone: string;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly address: Address;
  /** Limite de credito, em centavos. */
  readonly creditLimit: number;
  /** Situacao financeira do `Customer`; so leitura aqui. */
  readonly financialStatus?: FinancialStatus | null;
  readonly updatedAt: string | null;
  readonly updatedByName: string | null;
}
