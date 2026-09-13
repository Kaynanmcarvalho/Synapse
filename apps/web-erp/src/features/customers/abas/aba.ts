import type { Customer, SugestoesDoCadastro } from '@synapse/types';
import type { FormularioDoCliente } from '../formulario';
import type { ErrosDoFormulario } from '../validacao';

/** O que toda aba do cadastro recebe. `cliente` é o que está gravado (nulo em
 *  cadastro novo): serve para mostrar o que não se edita — código, datas, e o
 *  que o resto do sistema já sabe sobre este cliente. */
export interface PropsDaAba {
  readonly formulario: FormularioDoCliente;
  readonly mudar: <C extends keyof FormularioDoCliente>(
    campo: C,
    valor: FormularioDoCliente[C],
  ) => void;
  readonly erros: ErrosDoFormulario;
  readonly sugestoes: SugestoesDoCadastro | null;
  readonly vendedores: readonly { readonly id: string; readonly name: string }[] | null;
  readonly cliente: Customer | null;
}

export const OPCOES_DE_TIPO = [
  ['PJ', 'Pessoa jurídica'],
  ['PF', 'Pessoa física'],
  ['RURAL_PRODUCER', 'Produtor rural'],
] as const;

export const OPCOES_DE_INDICADOR_IE = [
  ['CONTRIBUINTE', '1 — Contribuinte de ICMS'],
  ['ISENTO', '2 — Isento de inscrição'],
  ['NAO_CONTRIBUINTE', '9 — Não contribuinte'],
] as const;

export const OPCOES_DE_REGIME = [
  ['', 'Não informado'],
  ['SIMPLES_NACIONAL', '1 — Simples Nacional'],
  ['SIMPLES_EXCESSO', '2 — Simples Nacional, excesso de sublimite'],
  ['REGIME_NORMAL', '3 — Regime normal'],
  ['MEI', '4 — MEI'],
] as const;

export const OPCOES_DE_SITUACAO = [
  ['REGULAR', 'Desbloqueado para venda'],
  ['BLOCKED', 'Bloqueado para venda'],
] as const;

export const OPCOES_DE_AUTORIZACAO = [
  ['SEM_RESTRICAO', 'Sem restrição'],
  ['SOMENTE_A_VISTA', 'Somente à vista'],
] as const;
