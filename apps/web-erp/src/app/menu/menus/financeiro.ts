import { item, montarMenu, SEPARADOR as SEP, submenu } from '../menu.utils';

/** Financeiro, na ordem do Syndata. Os boletos do Synapse entram em
 *  "Gerenciamento de Cobranca Bancaria", onde o Syndata guarda a cobranca. */
export const FINANCEIRO = montarMenu('Financeiro', [
  submenu('Contas a Pagar', [
    item('Controle de Títulos'),
    item('Lançamento de Títulos'),
    item('Baixa de Títulos'),
  ]),
  submenu('Contas a Receber', [
    item('Controle de Títulos'),
    item('Lançamento de Títulos'),
    item('Baixa de Títulos'),
    item('Gerenciamento de Cobrança Bancária', {
      para: '/financeiro/boletos',
      feature: 'BANKS',
    }),
    item('Ajuste de Valor de Título'),
    SEP,
    item('Faturamento'),
  ]),
  item('Crédito do Cliente'),
  item('Controle de Recibos Emitidos'),
  SEP,
  submenu('Controle de Contas (Caixa e Bancos)', [
    item('Controle de Contas (Caixa e Bancos)'),
    item('Fechar Caixa'),
  ]),
  item('Registrar Sangria / Suprimentos', { para: '/vendas/pdv' }),
  item('Fluxo de Caixa'),
  SEP,
  item('Emissão do Plano de Contas'),
  item('Livro Caixa'),
  SEP,
  submenu('Relatórios', [
    item('Resumo Financeiro Simplificado'),
    SEP,
    item('Contas a Pagar'),
    item('Contas a Receber'),
    item('Crédito do Cliente'),
    item('Fluxo de Caixa'),
    item('Centro de Custo'),
    item('Demonstração do Resultado do Exercício (DRE)'),
  ]),
]);
