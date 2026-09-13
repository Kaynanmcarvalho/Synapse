import type { BillingNoteContent, FiscalEmissionSettings, FiscalEnvironment } from '@synapse/types';
import type { Etapa } from './assistente.tipos';

/** Mesmas etapas e abas do assistente do Syndata, na mesma ordem. */
export const ETAPAS: readonly Etapa[] = [
  {
    id: 'empresa',
    rotulo: 'Parâmetros da Empresa',
    descricao: 'Dados do estabelecimento emissor da nota fiscal eletrônica.',
    abas: [],
  },
  {
    id: 'nota-fiscal',
    rotulo: 'Nota Fiscal Eletrônica',
    descricao: 'Emissão de nota fiscal eletrônica modelo 55 (NF-e) e 65 (NFC-e).',
    abas: [
      { id: 'emissao', rotulo: 'Emissão e E-mail' },
      { id: 'webservice', rotulo: 'WebService' },
      { id: 'certificado', rotulo: 'Certificado Digital' },
      { id: 'pis-cofins', rotulo: 'PIS / COFINS - Padrão' },
      { id: 'pos-mobile', rotulo: 'POS Mobile' },
    ],
  },
  {
    id: 'nfe',
    rotulo: 'NF-e',
    descricao: 'Emissão de nota fiscal eletrônica de produtos, modelo 55.',
    abas: [
      { id: 'configuracoes', rotulo: 'Configurações' },
      { id: 'series', rotulo: 'Controle de Série' },
      { id: 'danfe', rotulo: 'DANFE NF-e' },
      { id: 'forma-emissao', rotulo: 'Forma de Emissão' },
    ],
  },
  {
    id: 'nfce',
    rotulo: 'NFC-e',
    descricao: 'Emissão de nota fiscal eletrônica de venda a consumidor final, modelo 65.',
    abas: [
      { id: 'configuracoes', rotulo: 'Configurações' },
      { id: 'series', rotulo: 'Controle de Séries' },
      { id: 'danfe', rotulo: 'DANFE NFC-e' },
      { id: 'forma-emissao', rotulo: 'Forma de Emissão' },
      { id: 'cartao', rotulo: 'Pagamentos Cartão' },
    ],
  },
  {
    id: 'sincronia',
    rotulo: 'Sincronia de dados',
    descricao: 'Confira as pendências e grave a configuração no servidor do Synapse.',
    abas: [],
  },
  {
    id: 'conclusao',
    rotulo: 'Conclusão',
    descricao: 'Resumo do que foi configurado e próximos passos.',
    abas: [],
  },
];

export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export const CRTS: ReadonlyArray<{ readonly valor: 1 | 2 | 3 | 4; readonly rotulo: string }> = [
  { valor: 1, rotulo: 'Simples Nacional' },
  { valor: 2, rotulo: 'Simples Nacional - excesso de sublimite' },
  { valor: 3, rotulo: 'Regime Normal' },
  { valor: 4, rotulo: 'Simples Nacional - MEI' },
];

export const rotuloDoCrt = (crt: 1 | 2 | 3 | 4): string =>
  CRTS.find((opcao) => opcao.valor === crt)?.rotulo ?? 'Regime Normal';

export const AMBIENTES: ReadonlyArray<{
  readonly valor: FiscalEnvironment;
  readonly rotulo: string;
}> = [
  { valor: 'HOMOLOGACAO', rotulo: 'Homologação' },
  { valor: 'PRODUCAO', rotulo: 'Produção' },
  { valor: 'SANDBOX', rotulo: 'Sandbox do provedor' },
  { valor: 'MOCK', rotulo: 'Simulação' },
];

export const rotuloDoAmbiente = (ambiente: FiscalEnvironment): string =>
  AMBIENTES.find((opcao) => opcao.valor === ambiente)?.rotulo ?? ambiente;

export const PROVEDORES = [
  { valor: 'GYN_FISCAL', rotulo: 'Gyn Fiscal' },
  { valor: 'MOCK', rotulo: 'Simulação (não fala com a SEFAZ)' },
] as const;

export const CONTEUDO_DO_FATURAMENTO: ReadonlyArray<{
  readonly valor: BillingNoteContent;
  readonly rotulo: string;
}> = [
  { valor: 'DUE_DATES', rotulo: 'Vencimentos' },
  { valor: 'AMOUNTS', rotulo: 'Valores das parcelas' },
  { valor: 'BOTH', rotulo: 'As duas opções' },
];

type OpcaoBooleana = keyof {
  [
    Chave in keyof FiscalEmissionSettings as FiscalEmissionSettings[Chave] extends boolean
      ? Chave
      : never
  ]: true;
};

/** Caixas da aba Emissao e E-mail, na ordem do Syndata. */
export const OPCOES_DE_EMISSAO: ReadonlyArray<{
  readonly chave: Exclude<OpcaoBooleana, 'autoSendEmail'>;
  readonly rotulo: string;
}> = [
  {
    chave: 'reuseLastNote',
    rotulo: 'Recuperar última observação utilizada na emissão da nota fiscal',
  },
  {
    chave: 'showAuthorizationReceipt',
    rotulo: 'Visualizar recibo de autorização de uso da nota fiscal emitida',
  },
  {
    chave: 'receivablesInXml',
    rotulo: 'Levar faturamento do Contas a Receber para o XML/DANFE da nota fiscal',
  },
  {
    chave: 'billingInOrderNote',
    rotulo: 'Levar faturamento na observação da nota fiscal de pedido',
  },
  { chave: 'sellerInNote', rotulo: 'Levar vendedor na observação da nota fiscal' },
  { chave: 'customerEmailInXml', rotulo: 'Levar e-mail do cliente para o XML da nota fiscal' },
  {
    chave: 'allowGenericNumbering',
    rotulo: 'Permitir alterar numeração na emissão da nota fiscal genérica',
  },
  {
    chave: 'accountantXmlAuthorization',
    rotulo: 'Preencher CPF/CNPJ do contabilista para autorização de download do XML',
  },
  { chave: 'freightInNote', rotulo: 'Levar valor de frete para a nota fiscal' },
  { chave: 'orderNumberInNote', rotulo: 'Levar número do pedido na observação da nota fiscal' },
  {
    chave: 'customerTradeNameInNote',
    rotulo: 'Levar nome fantasia do destinatário na observação da nota fiscal',
  },
  { chave: 'removeAccents', rotulo: 'Remover acentuação de palavras ao gerar XML' },
];

type Cst = readonly [codigo: string, descricao: string];

/** Tabela CST de PIS/COFINS: 01 a 49 nas saídas, 50 a 99 nas entradas. */
export const CST_SAIDA: readonly Cst[] = [
  ['01', 'Operação Tributável com Alíquota Básica'],
  ['02', 'Operação Tributável com Alíquota Diferenciada'],
  ['03', 'Operação Tributável com Alíquota por Unidade de Medida de Produto'],
  ['04', 'Operação Tributável Monofásica - Revenda a Alíquota Zero'],
  ['05', 'Operação Tributável por Substituição Tributária'],
  ['06', 'Operação Tributável a Alíquota Zero'],
  ['07', 'Operação Isenta da Contribuição'],
  ['08', 'Operação sem Incidência da Contribuição'],
  ['09', 'Operação com Suspensão da Contribuição'],
  ['49', 'Outras Operações de Saída'],
];

export const CST_ENTRADA: readonly Cst[] = [
  ['50', 'Crédito vinculado exclusivamente a receita tributada no mercado interno'],
  ['51', 'Crédito vinculado exclusivamente a receita não tributada no mercado interno'],
  ['52', 'Crédito vinculado exclusivamente a receita de exportação'],
  ['53', 'Crédito vinculado a receitas tributadas e não tributadas no mercado interno'],
  ['54', 'Crédito vinculado a receitas tributadas no mercado interno e de exportação'],
  ['55', 'Crédito vinculado a receitas não tributadas no mercado interno e de exportação'],
  [
    '56',
    'Crédito vinculado a receitas tributadas e não tributadas no mercado interno e de exportação',
  ],
  ['60', 'Crédito presumido - vinculado exclusivamente a receita tributada no mercado interno'],
  ['61', 'Crédito presumido - vinculado exclusivamente a receita não tributada no mercado interno'],
  ['62', 'Crédito presumido - vinculado exclusivamente a receita de exportação'],
  ['63', 'Crédito presumido - receitas tributadas e não tributadas no mercado interno'],
  ['64', 'Crédito presumido - receitas tributadas no mercado interno e de exportação'],
  ['65', 'Crédito presumido - receitas não tributadas no mercado interno e de exportação'],
  [
    '66',
    'Crédito presumido - receitas tributadas e não tributadas no mercado interno e de exportação',
  ],
  ['67', 'Crédito presumido - outras operações'],
  ['70', 'Operação de aquisição sem direito a crédito'],
  ['71', 'Operação de aquisição com isenção'],
  ['72', 'Operação de aquisição com suspensão'],
  ['73', 'Operação de aquisição a alíquota zero'],
  ['74', 'Operação de aquisição sem incidência da contribuição'],
  ['75', 'Operação de aquisição por substituição tributária'],
  ['98', 'Outras operações de entrada'],
  ['99', 'Outras operações'],
];

/** Bandeiras do grupo de cartão da NFC-e (tBand). */
export const BANDEIRAS = [
  'Visa',
  'Mastercard',
  'American Express',
  'Sorocred',
  'Diners Club',
  'Elo',
  'Hipercard',
  'Aura',
  'Cabal',
  'Outros',
] as const;
