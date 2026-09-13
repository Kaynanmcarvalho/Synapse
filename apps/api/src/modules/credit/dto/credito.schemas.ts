import { z } from 'zod';

const itemSchema = z.object({
  productId: z.string().min(1),
  descricao: z.string().min(1).max(200),
  /** Milesimos: 1500 = 1,5 unidade. */
  quantidade: z.number().int().positive(),
  precoUnitarioCentavos: z.number().int().min(0),
  descontoCentavos: z.number().int().min(0).default(0),
});

export const registrarPedidoSchema = z.object({
  branchId: z.string().min(1),
  customerId: z.string().min(1),
  clienteNome: z.string().min(1).max(200),
  clienteDocumento: z.string().max(32).nullable().default(null),
  clienteCidade: z.string().max(120).nullable().default(null),
  clienteBairro: z.string().max(120).nullable().default(null),
  tipo: z
    .enum(['VENDA', 'BONIFICACAO', 'TROCA', 'DEVOLUCAO', 'CONSIGNACAO', 'AMOSTRA'])
    .default('VENDA'),
  origem: z.enum(['DESKTOP', 'MOBILE', 'BALCAO', 'API']),
  vendedorId: z.string().nullable().default(null),
  vendedorNome: z.string().min(1).max(200),
  condicaoDePagamento: z.string().min(1).max(120),
  /** Vencimentos combinados, em dias: [28, 35, 42]. Vazio e a vista. */
  vencimentosEmDias: z.array(z.number().int().min(0).max(365)).max(24).default([]),
  formaDePagamento: z.string().min(1).max(60),
  observacao: z.string().max(500).nullable().default(null),
  itens: z.array(itemSchema).min(1).max(500),
});

export type RegistrarPedidoInput = z.infer<typeof registrarPedidoSchema>;

/** Quantos registros cada parte da tela carrega. O padrao e o que a operacao
 *  pediu: os ultimos 150 de cada lista. */
export const impressaoSchema = z.object({ impresso: z.boolean() });

/** Liberacao em lote: os pedidos que o analista marcou na ficha do cliente. */
export const liberacaoSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
});

export const observacaoSchema = z.object({
  texto: z.string().trim().min(1).max(1000),
});

const texto = (maximo: number) => z.string().trim().max(maximo);

export const cadastroSchema = z.object({
  type: z.enum(['PF', 'PJ', 'RURAL_PRODUCER']),
  name: texto(200).min(1),
  legalName: texto(200).nullable(),
  taxId: z
    .string()
    .transform((valor) => valor.replace(/\D/g, ''))
    .refine((valor) => valor.length === 11 || valor.length === 14, 'CPF ou CNPJ incompleto'),
  stateRegistration: texto(30).nullable(),
  phone: texto(30),
  whatsapp: texto(30).nullable(),
  email: z.string().trim().email('E-mail inválido').max(200).nullable(),
  address: z.object({
    street: texto(200),
    number: texto(20),
    complement: texto(120).nullable(),
    district: texto(120),
    city: texto(120),
    state: texto(2),
    postalCode: z.string().transform((valor) => valor.replace(/\D/g, '').slice(0, 8)),
  }),
  creditLimit: z.number().int().min(0),
});

export type LiberacaoInput = z.infer<typeof liberacaoSchema>;
export type ObservacaoInput = z.infer<typeof observacaoSchema>;
export type CadastroInput = z.infer<typeof cadastroSchema>;

export type ImpressaoInput = z.infer<typeof impressaoSchema>;

export const limiteQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(150),
});

export const filaQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type LimiteQuery = z.infer<typeof limiteQuerySchema>;
export type FilaQuery = z.infer<typeof filaQuerySchema>;
