import { z } from 'zod';

const money = z.number().int().nonnegative();

export const openCashSessionSchema = z.object({
  branchId: z.string().min(1),
  openingAmount: money,
  /** Depósito que as vendas deste caixa baixam. */
  warehouseId: z.string().trim().min(1).max(60).default('deposito-1'),
});

export const cashMovementSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().trim().min(3).max(240),
});

export const closeCashSessionSchema = z.object({ countedCash: money });

export const completePosSaleSchema = z
  .object({
    /** NFC-e emite cupom fiscal; balcão emite o pedido sem valor fiscal. */
    modo: z.enum(['NFCE', 'BALCAO']).default('NFCE'),
    /** Empresa emissora; é sempre a do próprio tenant, então pode vir vazio. */
    companyId: z.string().min(1).optional(),
    customerId: z.string().min(1).nullable().optional(),
    customerTaxId: z
      .string()
      .regex(/^(\d{11}|\d{14})$/, 'CPF ou CNPJ na nota com 11 ou 14 dígitos')
      .nullable()
      .optional(),
    clienteNome: z.string().trim().max(160).nullable().optional(),
    /** Funcionário vendedor (Cadastro de Funcionários). */
    funcionarioId: z.string().min(1).nullable().optional(),
    /** Login que vendeu, para quem ainda não usa o cadastro de funcionários. */
    sellerId: z.string().min(1).optional(),
    mesaOuCartao: z.string().trim().max(20).nullable().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          barcode: z.string().min(8).max(14).nullable().optional(),
          description: z.string().trim().max(240).optional(),
          quantity: z.number().int().positive(),
          unitPrice: money.optional(),
          discount: money.default(0),
          surcharge: money.default(0),
          lote: z.string().trim().max(60).nullable().optional(),
          serie: z.string().trim().max(60).nullable().optional(),
        }),
      )
      .min(1, 'A venda precisa de ao menos um item'),
    payments: z
      .array(
        z.object({
          /** Forma de pagamento da tabela (1 - DINHEIRO...). */
          formaCodigo: z.number().int().positive().optional(),
          method: z
            .enum(['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD', 'BOLETO', 'ON_ACCOUNT', 'WALLET'])
            .optional(),
          amount: z.number().int().positive(),
          reference: z.string().max(120).nullable().optional(),
        }),
      )
      .min(1, 'Informe o pagamento'),
  })
  .superRefine((valor, contexto) => {
    valor.payments.forEach((pagamento, indice) => {
      if (!pagamento.formaCodigo && !pagamento.method)
        contexto.addIssue({
          code: 'custom',
          path: ['payments', indice, 'formaCodigo'],
          message: 'Escolha a forma de pagamento',
        });
    });
  });

export const cancelarVendaSchema = z.object({
  motivo: z.string().trim().min(15, 'Descreva o motivo (15 caracteres ou mais)').max(255),
});

export type CashMovementInput = z.infer<typeof cashMovementSchema>;
export type CompletePosSaleInput = z.infer<typeof completePosSaleSchema>;
export type CancelarVendaInput = z.infer<typeof cancelarVendaSchema>;
