import { isValidCnpj, isValidCpf, isValidCpfOrCnpj } from '@synapse/validation';
import { z } from 'zod';

/** Blocos do Assistente de Configuracao de NF-e. Campo vazio e aceito para o
 *  usuario salvar o progresso; o que vier preenchido precisa estar bem formado. */

const text = (max: number) => z.string().trim().max(max);
const digits = (max: number) =>
  z.string().regex(new RegExp(`^\\d{0,${max}}$`), `Informe até ${max} dígitos`);
const optionalDocument = z
  .string()
  .regex(/^\d*$/)
  .refine((value) => value === '' || isValidCpfOrCnpj(value), 'CPF ou CNPJ inválido');
const optionalCnpj = z
  .string()
  .regex(/^\d*$/)
  .refine((value) => value === '' || isValidCnpj(value), 'CNPJ inválido');
const cfop = (first: '5' | '6') =>
  z
    .string()
    .regex(new RegExp(`^${first}\\d{3}$`), `CFOP deve ter 4 dígitos e começar com ${first}`);
const percent = z.number().min(0).max(100);
const documentNumber = z.number().int().min(1).max(999_999_999);

const addressSchema = z.object({
  zipCode: digits(8),
  street: text(120),
  number: text(20),
  complement: text(60),
  district: text(60),
  cityCode: digits(7),
  cityName: text(60),
  countryCode: z.literal('1058'),
});

export const issuerSchema = z
  .object({
    personType: z.enum(['PJ', 'PF']),
    document: z.string().regex(/^\d*$/),
    legalName: text(120),
    tradeName: text(120),
    municipalRegistration: text(20),
    suframaRegistration: digits(9),
    address: addressSchema,
    phone: digits(11),
    phone2: digits(11),
    fax: digits(11),
    email: z.union([z.literal(''), z.string().trim().email().max(120)]),
    responsible: text(80),
    cnae: digits(7),
    accountantDocument: optionalDocument,
    accountantName: text(120),
  })
  .refine(
    ({ personType, document }) =>
      document === '' || (personType === 'PJ' ? isValidCnpj(document) : isValidCpf(document)),
    { message: 'CNPJ/CPF do emitente inválido', path: ['document'] },
  );

export const emissionSchema = z.object({
  reuseLastNote: z.boolean(),
  showAuthorizationReceipt: z.boolean(),
  receivablesInXml: z.boolean(),
  billingInOrderNote: z.boolean(),
  billingNoteContent: z.enum(['DUE_DATES', 'AMOUNTS', 'BOTH']),
  sellerInNote: z.boolean(),
  customerEmailInXml: z.boolean(),
  allowGenericNumbering: z.boolean(),
  accountantXmlAuthorization: z.boolean(),
  freightInNote: z.boolean(),
  orderNumberInNote: z.boolean(),
  customerTradeNameInNote: z.boolean(),
  removeAccents: z.boolean(),
  xmlDownloadDocument: optionalDocument,
  paymentBeneficiaryCnpj: optionalCnpj,
  autoSendEmail: z.boolean(),
});

export const emailSchema = z.object({
  host: text(120),
  port: z.number().int().min(1).max(65535),
  security: z.enum(['SSL', 'STARTTLS', 'NONE']),
  username: text(120),
  senderEmail: z.union([z.literal(''), z.string().trim().email().max(120)]),
  senderName: text(80),
});

const pisCofinsDefaultSchema = z.object({
  cst: z.string().regex(/^\d{2}$/),
  baseReductionPercent: percent,
  pisRate: percent,
  cofinsRate: percent,
  revenueNature: digits(3),
});

export const pisCofinsSchema = z.object({
  outbound: pisCofinsDefaultSchema,
  inbound: pisCofinsDefaultSchema,
});

export const nfeSettingsSchema = z.object({
  cfopInState: cfop('5'),
  cfopOutOfState: cfop('6'),
  operationNature: z.string().trim().min(1).max(60),
  nextNumber: documentNumber,
  danfeOrientation: z.enum(['PORTRAIT', 'LANDSCAPE']),
  additionalInfo: text(2000),
  emissionMode: z.enum(['NORMAL', 'CONTINGENCY']),
});

const seriesAssignmentSchema = z.object({
  id: z.string().min(1).max(60),
  identifier: z.string().trim().min(1).max(120),
  system: z.enum(['RETAGUARDA', 'PDV']),
  name: text(80),
  series: z.number().int().min(1).max(999),
  nextNumber: documentNumber,
});

const acquirerSchema = z.object({
  id: z.string().min(1).max(60),
  legalName: z.string().trim().min(2).max(120),
  tradeName: text(60),
  cnpj: z.string().refine(isValidCnpj, 'CNPJ da credenciadora inválido'),
  establishmentCodes: z.array(z.string().trim().min(1).max(30)).max(50),
  brandCodes: z
    .array(
      z.object({ brand: z.string().trim().min(1).max(30), code: z.string().trim().min(1).max(30) }),
    )
    .max(50),
});

export const nfceSettingsSchema = z.object({
  cfopInState: cfop('5'),
  openEmissionScreen: z.boolean(),
  seriesMode: z.enum(['TERMINAL', 'USER']),
  series: z
    .array(seriesAssignmentSchema)
    .max(200)
    .refine(
      (rows) => new Set(rows.map((row) => row.identifier)).size === rows.length,
      'Cada terminal ou usuário só pode aparecer uma vez',
    ),
  danfe: z.object({
    style: z.enum(['MINI_PRINTER', 'A4']),
    detailed: z.boolean(),
    productAdditionalInfo: z.boolean(),
    approximateTaxes: z.boolean(),
    a4Layout: z.enum(['STANDARD', 'COMPACT']),
    unidentifiedConsumerName: z.boolean(),
    cutPaper: z.boolean(),
    orderPassword: z.boolean(),
    registerNumber: z.boolean(),
    additionalInfo: text(2000),
  }),
  emissionMode: z.enum(['NORMAL', 'CONTINGENCY']),
  requireOfflinePassword: z.boolean(),
  acquirers: z.array(acquirerSchema).max(50),
});
