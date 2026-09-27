/** Tratamento monetário da Fase 4.2, formalizado como utilitário compartilhado
 *  na Fase 4.3 (Home e a Lista de Clientes precisavam do mesmo "R$" separado
 *  do número — sem duplicar a função entre as duas telas).
 *
 *  Bug real achado pelo teste desta fase: Intl.NumberFormat('pt-BR', {style:
 *  'currency', ...}) separa "R$" do valor com espaco sem quebra (nao um
 *  espaco comum) - a checagem original (comparando com "R$ " literal) nunca
 *  batia de verdade, e o "R$" nunca tinha sido separado do numero desde a
 *  Fase 4.2. `\s` no regex ja cobre os dois casos (o JavaScript inclui o
 *  espaco sem quebra na classe de espacos). */
const PREFIXO_MOEDA = /^R\$\s/;

export const separarMoeda = (
  valor: string,
): { readonly prefixo: string | null; readonly numero: string } =>
  PREFIXO_MOEDA.test(valor)
    ? { prefixo: 'R$', numero: valor.slice(3) }
    : { prefixo: null, numero: valor };
