import type {
  BankId,
  BoletoStatus,
  FormaDeLiquidacao,
  NaturezaDaCobranca,
  SituacaoDoBoletoNoSynapse,
  TituloStatus,
} from '@synapse/types';

/** Rotulos dos documentos financeiros: o codigo interno fica para o sistema, a
 *  tela fala como o financeiro fala. */

export const ROTULO_DA_NATUREZA: Record<NaturezaDaCobranca, string> = {
  SEM_COBRANCA: 'Sem cobrança',
  IMEDIATA: 'À vista (PIX/dinheiro)',
  CARTAO: 'Cartão',
  A_PRAZO: 'A prazo',
  CONSIGNACAO: 'Consignação',
};

export const ROTULO_DA_SITUACAO_DO_TITULO: Record<TituloStatus, string> = {
  ABERTO: 'Em aberto',
  PARCIAL: 'Pago parcialmente',
  QUITADO: 'Quitado',
  VENCIDO: 'Vencido',
  RENEGOCIADO: 'Renegociado',
  CANCELADO: 'Cancelado',
};

export const ROTULO_DA_FORMA: Record<FormaDeLiquidacao, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CARTAO_DEBITO: 'Cartão de débito',
  CARTAO_CREDITO: 'Cartão de crédito',
  TRANSFERENCIA: 'Transferência',
  COMPENSACAO: 'Compensação',
};

export const ROTULO_DO_BANCO: Record<BankId, string> = {
  SICREDI: 'Sicredi',
  ITAU: 'Itaú',
  BANCO_DO_BRASIL: 'Banco do Brasil',
  BRADESCO: 'Bradesco',
  SANTANDER: 'Santander',
  SICOOB: 'Sicoob',
};

export const ROTULO_DO_BOLETO: Record<SituacaoDoBoletoNoSynapse, string> = {
  PENDING: 'Aguardando registro',
  REGISTERED: 'Registrado no banco',
  PAID: 'Pago',
  OVERDUE: 'Vencido',
  CANCELLED: 'Cancelado',
};

/** Situacao que o banco devolveu. O codigo original aparece ao lado. */
export const ROTULO_DO_BOLETO_NO_BANCO: Record<BoletoStatus, string> = {
  PENDENTE: 'Pendente no banco',
  REGISTRADO: 'Entrada confirmada',
  LIQUIDADO: 'Liquidado',
  BAIXADO: 'Baixado',
  VENCIDO: 'Vencido',
  REJEITADO: 'Rejeitado',
};
