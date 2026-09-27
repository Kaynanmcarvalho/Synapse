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

/** Fase 6.1 — auditoria encontrou `Number(texto)` lendo o que o usuário digita
 *  em Purchasing e Boletos: funciona hoje porque os campos são
 *  `<input type="number">` (o navegador só aceita ponto). O dia que um desses
 *  campos virar `MoneyInput` (texto, formato pt-BR), `Number("12,50")` vira
 *  `NaN` — o problema que esta função resolve antes de precisar.
 *
 *  Regra: vírgula sozinha é decimal ("12,50" → 12.5); ponto **e** vírgula
 *  juntos, o ponto é milhar ("1.234,56" → 1234.56); só ponto (sem vírgula)
 *  continua decimal — é o formato que `type="number"` já entrega, e não dá
 *  para saber se "1.234" era milhar ou 1,234 sem mais contexto. Não arredonda
 *  nem converte para centavos: quem chama decide a unidade, como já fazia. */
export const analisarMoeda = (texto: string | null | undefined): number | null => {
  if (texto == null) return null;
  const bruto = texto.trim();
  if (bruto === '') return null;
  const limpo = bruto.replace(/[^\d,.-]/g, '');
  // "abc" vira "" depois do replace acima — e Number("") é 0, não NaN.
  if (!/\d/.test(limpo)) return null;
  const normalizado =
    limpo.includes(',') && limpo.includes('.')
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo.replace(',', '.');
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
};
