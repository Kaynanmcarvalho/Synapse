import { z } from 'zod';
import { isValidCnpj, isValidCpf } from '../rules/document';
import {
  cepOpcional,
  codigoIbgeOpcional,
  digitos,
  emailOpcional,
  referenciaDeTabelaSchema,
  telefoneOpcional,
  textoOpcional,
  ufOpcional,
} from './cadastro-comum.schema';

/** O cadastro de fornecedores do Syndata num schema só — o mesmo na tela e na
 *  API. Nada aqui é obrigatório além de quem é o fornecedor (nome e documento):
 *  a entrada por XML e o pedido de compra precisam achar o fornecedor, e o resto
 *  da ficha se completa com o tempo. */

const telefoneDoCadastro = z
  .object({
    numero: telefoneOpcional,
    whatsapp: z.boolean().default(false),
  })
  .transform((valor) => (valor.numero ? { numero: valor.numero, whatsapp: valor.whatsapp } : null))
  .nullable()
  .default(null);

const endereco = z
  .object({
    cep: cepOpcional,
    logradouro: z.string().trim().max(200).default(''),
    numero: z.string().trim().max(20).default(''),
    complemento: textoOpcional(120),
    bairro: z.string().trim().max(120).default(''),
    cidadeCodigoIbge: codigoIbgeOpcional,
    cidade: z.string().trim().max(120).default(''),
    uf: ufOpcional,
    paisCodigo: z
      .string()
      .transform(digitos)
      .refine((valor) => valor.length >= 3 && valor.length <= 4, 'Código do país inválido')
      .default('1058'),
    paisNome: z.string().trim().max(60).default('BRASIL'),
  })
  .default({});

const escrituracao = z
  .object({
    codigoDoParticipante: textoOpcional(60),
    contaContabil: textoOpcional(40),
    atividade: z
      .enum([
        'INDUSTRIA',
        'ATACADO',
        'VAREJO',
        'PRODUTOR_RURAL',
        'PRESTADOR_DE_SERVICO',
        'IMPORTADOR',
        'OUTROS',
      ])
      .default('ATACADO'),
    inscricaoSuframa: z
      .string()
      .transform(digitos)
      .refine((valor) => valor === '' || /^\d{8,9}$/.test(valor), 'Inscrição SUFRAMA inválida')
      .transform((valor) => valor || null)
      .nullable()
      .default(null),
    nitPis: z
      .string()
      .transform(digitos)
      .refine((valor) => valor === '' || valor.length === 11, 'NIT/PIS tem 11 dígitos')
      .transform((valor) => valor || null)
      .nullable()
      .default(null),
    geraCreditoPisCofins: z.boolean().default(true),
    retemFunrural: z.boolean().default(false),
    retencoes: z
      .object({
        irrf: z.boolean().default(false),
        pis: z.boolean().default(false),
        cofins: z.boolean().default(false),
        csll: z.boolean().default(false),
        inss: z.boolean().default(false),
        iss: z.boolean().default(false),
      })
      .default({}),
  })
  .default({});

export const fornecedorSchema = z
  .object({
    tipoDePessoa: z.enum(['FISICA', 'JURIDICA', 'ESTRANGEIRA']).default('JURIDICA'),
    documento: z.string().trim().max(20).default(''),
    razaoSocial: z
      .string()
      .trim()
      .min(2, 'Informe a razão social')
      .max(160, 'Use até 160 caracteres'),
    nomeFantasia: z.string().trim().max(160).default(''),
    ativo: z.boolean().default(true),
    endereco,
    praca: referenciaDeTabelaSchema,
    grupo: referenciaDeTabelaSchema,
    subGrupo: referenciaDeTabelaSchema,
    regimeTributario: z
      .enum(['SIMPLES_NACIONAL', 'SIMPLES_EXCESSO', 'REGIME_NORMAL', 'MEI'])
      .nullable()
      .default(null),
    observacao: textoOpcional(2000),
    telefone1: telefoneDoCadastro,
    telefone2: telefoneDoCadastro,
    fax: telefoneOpcional,
    site: textoOpcional(200),
    email: emailOpcional,
    emailNfe: emailOpcional,
    inscricaoEstadual: z
      .string()
      .trim()
      .transform((valor) => (/^isento$/i.test(valor) ? 'ISENTO' : digitos(valor)))
      .refine(
        (valor) => valor === '' || valor === 'ISENTO' || /^\d{2,14}$/.test(valor),
        'Inscrição estadual inválida',
      )
      .default(''),
    indicadorIe: z.enum(['CONTRIBUINTE', 'ISENTO', 'NAO_CONTRIBUINTE']).default('CONTRIBUINTE'),
    inscricaoMunicipal: textoOpcional(20),
    representante: z
      .object({
        nome: textoOpcional(120),
        telefone: telefoneOpcional,
        celular: telefoneOpcional,
      })
      .default({}),
    escrituracao,
    prazoMedioDeEntregaDias: z.number().int().min(0).max(365).default(0),
  })
  .superRefine((valor, contexto) => {
    const documento = digitos(valor.documento);
    if (valor.tipoDePessoa === 'JURIDICA') {
      if (documento.length === 0)
        contexto.addIssue({ code: 'custom', path: ['documento'], message: 'Informe o CNPJ' });
      else if (!isValidCnpj(documento))
        contexto.addIssue({ code: 'custom', path: ['documento'], message: 'CNPJ inválido' });
    }
    if (valor.tipoDePessoa === 'FISICA') {
      if (documento.length === 0)
        contexto.addIssue({ code: 'custom', path: ['documento'], message: 'Informe o CPF' });
      else if (!isValidCpf(documento))
        contexto.addIssue({ code: 'custom', path: ['documento'], message: 'CPF inválido' });
    }
    if (valor.indicadorIe === 'CONTRIBUINTE' && valor.tipoDePessoa !== 'ESTRANGEIRA') {
      if (!valor.inscricaoEstadual || valor.inscricaoEstadual === 'ISENTO')
        contexto.addIssue({
          code: 'custom',
          path: ['inscricaoEstadual'],
          message: 'Contribuinte de ICMS exige inscrição estadual',
        });
    }
    if (valor.tipoDePessoa !== 'ESTRANGEIRA' && valor.endereco.paisCodigo !== '1058') {
      contexto.addIssue({
        code: 'custom',
        path: ['endereco', 'paisCodigo'],
        message: 'Fornecedor nacional fica no Brasil (1058)',
      });
    }
  })
  .transform((valor) => ({
    ...valor,
    documento:
      valor.tipoDePessoa === 'ESTRANGEIRA' ? valor.documento.trim() : digitos(valor.documento),
    nomeFantasia: valor.nomeFantasia || valor.razaoSocial,
  }));

export type FornecedorInput = z.infer<typeof fornecedorSchema>;
