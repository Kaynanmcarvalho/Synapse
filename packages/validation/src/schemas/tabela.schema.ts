import { z } from 'zod';

export const TIPOS_DE_TABELA_VALIDOS = [
  'cargos',
  'departamentos',
  'pracas',
  'grupos-de-fornecedor',
  'subgrupos-de-fornecedor',
  'formas-de-pagamento',
] as const;

export const tipoDeTabelaSchema = z.enum(TIPOS_DE_TABELA_VALIDOS);

export const meioDePagamentoSchema = z.enum([
  'DINHEIRO',
  'PIX',
  'CARTAO_DEBITO',
  'CARTAO_CREDITO',
  'BOLETO',
  'A_PRAZO',
  'CHEQUE',
  'BONIFICACAO',
  'OUTROS',
]);

/** Item de tabela auxiliar. O nome vai em maiúsculas, como o Syndata grava
 *  ("GERAL", "BONIFICAÇÃO"): assim "geral" e "Geral" não viram dois itens. */
export const itemDeTabelaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .max(60, 'Use até 60 caracteres')
    .transform((valor) => valor.toLocaleUpperCase('pt-BR')),
  ativo: z.boolean().default(true),
  meio: meioDePagamentoSchema.optional(),
});

export type ItemDeTabelaInput = z.infer<typeof itemDeTabelaSchema>;
