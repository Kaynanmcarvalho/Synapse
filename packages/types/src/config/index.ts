import type { BranchId, TenantId } from '../common';

/** Os dez dominios da secao 4 onde a heranca de configuracao se aplica.
 *  A chave de uma configuracao e sempre `<dominio>.<algo>`, ex.: `precos.margemPadrao`. */
export const CONFIG_DOMAINS = [
  'precos',
  'fiscal',
  'estoque',
  'vendas',
  'financeiro',
  'comissao',
  'formasPagamento',
  'descontos',
  'limites',
  'emissaoFiscal',
] as const;

export type ConfigDomain = (typeof CONFIG_DOMAINS)[number];

export type ConfigSource = 'GLOBAL' | 'INHERITED' | 'OVERRIDE';

export interface ResolvedConfigValue<T> {
  readonly key: string;
  readonly value: T;
  readonly source: ConfigSource;
}

/** Um valor gravado em um dos dois niveis. O nivel tenant e sempre a origem do
 *  GLOBAL; o nivel filial, quando presente, vira OVERRIDE — senao o valor
 *  resolvido cai para o do tenant e a origem passa a ser INHERITED. */
export interface ConfigEntry<T = unknown> {
  readonly tenantId: TenantId;
  readonly branchId: BranchId | null;
  readonly key: string;
  readonly value: T;
  readonly updatedAt: string;
}
