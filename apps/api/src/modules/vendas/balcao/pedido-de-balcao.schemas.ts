import { z } from 'zod';

/** O "(F3) Fechar Documento" do Ponto de Vendas. Preço e descrição não vêm da
 *  tela: a API resolve pelo catálogo e pela regra de preço. O preço digitado,
 *  quando menor, vira desconto e passa pelo limite do vendedor. */
export const pedidoDeBalcaoSchema = z.object({
  branchId: z.string().min(1),
  customerId: z.string().min(1, 'Informe o cliente (F11)'),
  funcionarioId: z.string().min(1, 'Informe o vendedor'),
  tipo: z
    .enum(['VENDA', 'BONIFICACAO', 'TROCA', 'DEVOLUCAO', 'CONSIGNACAO', 'AMOSTRA'])
    .default('VENDA'),
  formaDePagamentoCodigo: z.number().int().positive('Escolha a forma de pagamento'),
  /** "À vista", "30", "28/35/42". */
  condicaoDePagamento: z.string().trim().max(60).default(''),
  freteCentavos: z.number().int().min(0).default(0),
  acrescimoCentavos: z.number().int().min(0).default(0),
  observacao: z.string().trim().max(500).nullable().default(null),
  itens: z
    .array(
      z.object({
        productId: z.string().min(1),
        /** Milésimos: 1500 = 1,5 unidade. */
        quantidade: z.number().int().positive('Quantidade precisa ser maior que zero'),
        precoNegociadoCentavos: z.number().int().min(0).nullable().default(null),
        descontoCentavos: z.number().int().min(0).default(0),
        lote: z.string().trim().max(60).nullable().default(null),
      }),
    )
    .min(1, 'Lance ao menos um produto')
    .max(500),
});

export type PedidoDeBalcaoInput = z.infer<typeof pedidoDeBalcaoSchema>;

/** "28/35/42" -> [28, 35, 42]; vazio, "0" ou "à vista" -> []. */
export const lerCondicao = (texto: string): { dias: number[]; rotulo: string } => {
  const limpo = texto.trim();
  if (!limpo || /^(0|a\s*vista|à\s*vista)$/i.test(limpo)) return { dias: [], rotulo: 'À vista' };
  const dias = limpo
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number)
    .filter((dia) => Number.isInteger(dia) && dia >= 0 && dia <= 365);
  if (dias.length === 0 || dias.every((dia) => dia === 0)) return { dias: [], rotulo: 'À vista' };
  return { dias, rotulo: `${dias.join('/')} dias` };
};
