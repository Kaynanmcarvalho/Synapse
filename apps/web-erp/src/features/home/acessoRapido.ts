/** As rotinas mais usadas no balcao e na retaguarda, na ordem que a Home ja
 *  mostrava. Cada entrada aponta para o id estavel do item de menu — a mesma
 *  identidade que `navegacao.contrato.test.ts` protege — nunca para o rotulo
 *  exibido. Comparar por rotulo (como esta tela fazia antes) e fragil: um
 *  reescrever de texto no menu apaga o atalho aqui sem avisar ninguem.
 *  `HomeScreen.test.tsx` confere que todo id abaixo ainda resolve para um
 *  item real. */
export interface ItemDeAcessoRapido {
  readonly id: string;
  /** Nome curto no atalho, quando o do menu e comprido demais para a linha. */
  readonly nome?: string;
}

export const ACESSO_RAPIDO: readonly ItemDeAcessoRapido[] = [
  { id: 'vendas/analise-de-credito' },
  { id: 'vendas/venda-pdv-nfc-e' },
  { id: 'estoque/lancamento-de-nota-fiscal-de-entrada' },
  { id: 'estoque/balanco-de-estoque' },
  { id: 'financeiro/contas-a-receber/gerenciamento-de-cobranca-bancaria', nome: 'Boletos' },
  { id: 'cadastros/produtos-servicos/produtos-servicos', nome: 'Cadastro de Produtos' },
  { id: 'estoque/controle-de-notas-fiscais-emitidas-para-meu-cnpj' },
];
