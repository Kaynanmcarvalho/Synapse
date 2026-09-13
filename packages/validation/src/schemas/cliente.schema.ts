import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '../rules/document';

/** O cadastro de clientes inteiro, num schema só — o mesmo que valida a tela e
 *  a API. Aceita tanto o corpo antigo (`phone`/`whatsapp` soltos) quanto o novo
 *  (`telefones`), e devolve sempre a forma nova: assim a tela nova e o que já
 *  chamava a rota continuam funcionando sem dois contratos vivos. */

const digitos = (valor: string) => valor.replace(/\D/g, '');

const soDigitos = z.string().transform(digitos);

const telefone = soDigitos.refine(
  (valor) => valor.length >= 10 && valor.length <= 13,
  'Telefone inválido: informe DDD e número',
);

const telefoneOpcional = z
  .string()
  .transform(digitos)
  .refine(
    (valor) => valor === '' || (valor.length >= 10 && valor.length <= 13),
    'Telefone inválido: informe DDD e número',
  )
  .transform((valor) => valor || null)
  .nullable()
  .default(null);

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .transform((valor) => valor || null)
    .nullable()
    .default(null);

const emailOpcional = z
  .string()
  .trim()
  .max(200)
  .transform((valor) => valor || null)
  .nullable()
  .default(null)
  .refine(
    (valor) => valor === null || z.string().email().safeParse(valor).success,
    'E-mail inválido',
  );

const ie = z
  .string()
  .transform(digitos)
  .refine((valor) => valor === '' || /^\d{2,14}$/.test(valor), 'Inscrição estadual inválida')
  .transform((valor) => valor || null)
  .nullable()
  .default(null);

const endereco = z.object({
  street: z.string().trim().min(2, 'Informe o logradouro').max(200),
  number: z.string().trim().min(1, 'Informe o número').max(20),
  complement: textoOpcional(120),
  district: z.string().trim().min(2, 'Informe o bairro').max(120),
  city: z.string().trim().min(2, 'Informe a cidade').max(120),
  state: z
    .string()
    .trim()
    .length(2, 'UF tem 2 letras')
    .transform((valor) => valor.toUpperCase()),
  postalCode: soDigitos.refine((valor) => valor.length === 8, 'CEP inválido'),
});

/** CPF ou CNPJ, conferido pelo digito verificador, com a mensagem pelo tamanho. */
const documento = z
  .string()
  .transform(digitos)
  .superRefine((valor, contexto) => {
    const aviso =
      valor.length === 0
        ? 'Informe o CPF ou o CNPJ'
        : valor.length === 11
          ? isValidCpf(valor)
            ? null
            : 'CPF inválido'
          : valor.length === 14
            ? isValidCnpj(valor)
              ? null
              : 'CNPJ inválido'
            : 'CPF tem 11 dígitos e CNPJ, 14';
    if (aviso) contexto.addIssue({ code: 'custom', message: aviso });
  });

const telefones = z.object({
  principal: telefone,
  secundario: telefoneOpcional,
  celular: telefoneOpcional,
  whatsapp: telefoneOpcional,
});

const socio = z.object({
  nome: z.string().trim().min(2).max(160),
  cpf: soDigitos
    .refine((valor) => valor === '' || isValidCpf(valor), 'CPF do sócio inválido')
    .transform((valor) => valor || null)
    .nullable()
    .default(null),
});

const pessoaJuridica = z
  .object({
    contato: z
      .object({
        nome: z.string().trim().max(160).default(''),
        celular: telefoneOpcional,
        comprador: textoOpcional(160),
        foneDoComprador: telefoneOpcional,
      })
      .nullable()
      .default(null),
    socios: z.array(socio).max(10).default([]),
    contabilista: textoOpcional(160),
    dataDeAbertura: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de abertura inválida')
      .nullable()
      .default(null),
    ramoDeAtividade: textoOpcional(160),
    segmento: textoOpcional(120),
    substitutoTributario: z.boolean().default(false),
    revendedor: z.boolean().default(false),
    orgaoPublico: z.boolean().default(false),
    inscricaoSuframa: textoOpcional(20),
    tare: z
      .object({
        numero: z.string().trim().min(1, 'Informe o número do TARE').max(30),
        fomentarOuProduzir: z.boolean().default(false),
      })
      .nullable()
      .default(null),
  })
  .nullable()
  .default(null);

const referenciaComercial = z.object({
  id: z.string().max(64).optional(),
  empresa: z.string().trim().min(2, 'Informe a empresa').max(160),
  contato: textoOpcional(160),
  telefone: telefoneOpcional,
  observacao: textoOpcional(400),
});

const controleDeVendas = z
  .object({
    condicaoDePagamentoPadrao: textoOpcional(120),
    formaDePagamentoPadrao: textoOpcional(60),
    descontoMaximoPercentual: z.number().min(0).max(100).nullable().default(null),
    diasParaBloqueio: z.number().int().min(0).max(365).nullable().default(null),
    autorizacaoDePagamento: z.enum(['SEM_RESTRICAO', 'SOMENTE_A_VISTA']).default('SEM_RESTRICAO'),
  })
  .default({});

const classificacao = z
  .object({
    grupo: textoOpcional(80),
    subGrupo: textoOpcional(80),
    pracaOuRegiao: textoOpcional(80),
  })
  .default({});

export const clienteSchema = z
  .object({
    type: z.enum(['PF', 'PJ', 'RURAL_PRODUCER']),
    taxId: documento,
    stateRegistration: ie,
    municipalRegistration: textoOpcional(20),
    indicadorDeIe: z
      .enum(['CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE'])
      .default('NAO_CONTRIBUINTE'),
    regimeTributario: z
      .enum(['SIMPLES_NACIONAL', 'SIMPLES_EXCESSO', 'REGIME_NORMAL', 'MEI'])
      .nullable()
      .default(null),
    /** Nome fantasia (PJ) ou nome (PF): é como o cliente aparece em toda tela. */
    name: z.string().trim().min(2, 'Informe o nome').max(160),
    /** Razão social. */
    legalName: textoOpcional(160),
    address: endereco,
    codigoIbgeDaCidade: textoOpcional(7),
    pais: z.string().trim().max(60).default('BRASIL'),
    telefones: telefones.optional(),
    /** Aceito para não quebrar quem já chamava a rota com o telefone solto. */
    phone: z.string().optional(),
    whatsapp: z.string().nullable().optional(),
    email: emailOpcional,
    emailNfe: emailOpcional,
    creditLimit: z.number().int().nonnegative('Limite não pode ser negativo'),
    financialStatus: z.enum(['REGULAR', 'BLOCKED']).default('REGULAR'),
    responsibleSellerId: z.string().nullable().default(null),
    vendedorSecundarioId: z.string().nullable().default(null),
    priceTableId: z.string().nullable().default(null),
    paymentTermId: z.string().nullable().default(null),
    classificacao,
    pessoaJuridica,
    referenciasComerciais: z.array(referenciaComercial).max(20).default([]),
    controleDeVendas,
    observacao: textoOpcional(1000),
    observacaoInterna: textoOpcional(1000),
    active: z.boolean().default(true),
  })
  .superRefine((valor, contexto) => {
    if (valor.type === 'PF' && valor.taxId.length !== 11) {
      contexto.addIssue({
        code: 'custom',
        path: ['taxId'],
        message: 'Pessoa física usa CPF',
      });
    }
    if (valor.type !== 'PF' && valor.taxId.length !== 14) {
      contexto.addIssue({
        code: 'custom',
        path: ['taxId'],
        message: 'Pessoa jurídica e produtor rural usam CNPJ',
      });
    }
    if (valor.type === 'RURAL_PRODUCER' && !valor.stateRegistration) {
      contexto.addIssue({
        code: 'custom',
        path: ['stateRegistration'],
        message: 'Produtor rural exige inscrição estadual',
      });
    }
    if (valor.indicadorDeIe === 'CONTRIBUINTE' && !valor.stateRegistration) {
      contexto.addIssue({
        code: 'custom',
        path: ['stateRegistration'],
        message: 'Contribuinte de ICMS exige inscrição estadual',
      });
    }
    if (!valor.telefones && !valor.phone) {
      contexto.addIssue({
        code: 'custom',
        path: ['telefones', 'principal'],
        message: 'Informe ao menos um telefone',
      });
    }
  })
  // Uma forma só sai daqui: `telefones` canônico e `phone`/`whatsapp` derivados,
  // que é o que a busca, a NF-e e a ficha de crédito já leem.
  .transform((valor) => {
    const lista = valor.telefones ?? {
      principal: digitos(valor.phone ?? ''),
      secundario: null,
      celular: null,
      whatsapp: valor.whatsapp ? digitos(valor.whatsapp) : null,
    };
    return {
      ...valor,
      telefones: lista,
      phone: lista.principal,
      whatsapp: lista.whatsapp,
    };
  });

export type ClienteInput = z.infer<typeof clienteSchema>;
