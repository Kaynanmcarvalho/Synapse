import { z } from 'zod';
import { isValidCpf } from '../rules/document';
import {
  cepOpcional,
  codigoIbgeOpcional,
  dataOpcional,
  digitos,
  digitosOpcionais,
  emailOpcional,
  referenciaDeTabelaSchema,
  telefoneOpcional,
  textoOpcional,
  ufOpcional,
} from './cadastro-comum.schema';

/** O cadastro de funcionários do Syndata. Obrigatórios são os do asterisco na
 *  tela antiga: nome e admissão. O resto aparece conforme a empresa usa. */

const hora = z
  .string()
  .trim()
  .refine(
    (valor) => valor === '' || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(valor),
    'Hora inválida (use 08:00)',
  )
  .transform((valor) => (valor ? (valor.length === 5 ? `${valor}:00` : valor) : null))
  .nullable()
  .default(null);

const percentual = z
  .number({ invalid_type_error: 'Informe um percentual' })
  .min(0, 'Percentual não pode ser negativo')
  .max(100, 'Percentual vai até 100');

export const funcionarioSchema = z
  .object({
    matricula: textoOpcional(20),
    nome: z.string().trim().min(2, 'Informe o nome').max(120, 'Use até 120 caracteres'),
    bloqueado: z.boolean().default(false),
    endereco: z
      .object({
        cep: cepOpcional,
        logradouro: z.string().trim().max(200).default(''),
        bairro: z.string().trim().max(120).default(''),
        cidadeCodigoIbge: codigoIbgeOpcional,
        cidade: z.string().trim().max(120).default(''),
        uf: ufOpcional,
      })
      .default({}),
    telefone: telefoneOpcional,
    celular: telefoneOpcional,
    cargo: referenciaDeTabelaSchema,
    praca: referenciaDeTabelaSchema,
    departamento: referenciaDeTabelaSchema,
    horaDeEntrada: hora,
    horaDeSaida: hora,
    admissao: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data de admissão'),
    demissao: dataOpcional('Data de demissão inválida'),
    salarioCentavos: z.number().int().min(0, 'Salário não pode ser negativo').default(0),
    outrasInformacoes: z
      .object({
        nascimento: dataOpcional('Data de nascimento inválida'),
        sexo: z.enum(['MASCULINO', 'FEMININO', 'NAO_INFORMADO']).default('NAO_INFORMADO'),
        tipoSanguineo: z
          .string()
          .trim()
          .toUpperCase()
          .refine(
            (valor) => valor === '' || /^(A|B|AB|O)[+-]$/.test(valor),
            'Tipo sanguíneo inválido (ex.: O+)',
          )
          .transform((valor) => valor || null)
          .nullable()
          .default(null),
        escolaridade: textoOpcional(80),
        email: emailOpcional,
        pai: textoOpcional(120),
        mae: textoOpcional(120),
        estadoCivil: z
          .enum([
            'SOLTEIRO',
            'CASADO',
            'UNIAO_ESTAVEL',
            'SEPARADO',
            'DIVORCIADO',
            'VIUVO',
            'NAO_INFORMADO',
          ])
          .default('NAO_INFORMADO'),
        conjuge: textoOpcional(120),
        observacoes: textoOpcional(4000),
      })
      .default({}),
    documentos: z
      .object({
        identidade: textoOpcional(20),
        cpf: z
          .string()
          .transform(digitos)
          .refine((valor) => valor === '' || isValidCpf(valor), 'CPF inválido')
          .transform((valor) => valor || null)
          .nullable()
          .default(null),
        pis: digitosOpcionais(11, 11, 'PIS tem 11 dígitos'),
        tituloDeEleitor: digitosOpcionais(12, 12, 'Título de eleitor tem 12 dígitos'),
        ctps: textoOpcional(20),
        serieDaCtps: textoOpcional(10),
        cnh: digitosOpcionais(11, 11, 'CNH tem 11 dígitos'),
        categoriaDaCnh: z
          .string()
          .trim()
          .toUpperCase()
          .refine(
            (valor) => valor === '' || /^(ACC|A|B|C|D|E|AB|AC|AD|AE)$/.test(valor),
            'Categoria inválida',
          )
          .transform((valor) => valor || null)
          .nullable()
          .default(null),
      })
      .default({}),
    comissao: z
      .object({
        vendedor: z.boolean().default(false),
        percentualAVista: percentual.default(0),
        percentualAPrazo: percentual.default(0),
        base: z.enum(['FATURAMENTO', 'RECEBIMENTO']).default('FATURAMENTO'),
        descontoMaximoPercentual: percentual.default(0),
        metaMensalCentavos: z.number().int().min(0).default(0),
      })
      .default({}),
  })
  .superRefine((valor, contexto) => {
    if (valor.demissao && valor.demissao < valor.admissao) {
      contexto.addIssue({
        code: 'custom',
        path: ['demissao'],
        message: 'A demissão não pode ser antes da admissão',
      });
    }
  });

export type FuncionarioInput = z.infer<typeof funcionarioSchema>;
