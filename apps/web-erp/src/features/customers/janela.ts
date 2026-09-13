import type { FormularioDoCliente } from './formulario';
import { ABA_DO_CAMPO, type ErrosDoFormulario } from './validacao';

/** As abas do cadastro, na ordem do Syndata. */
export const ABAS = [
  ['principal', 'Principal'],
  ['pessoa-juridica', 'Pessoa Jurídica'],
  ['referencias', 'Ref. Comerciais'],
  ['controle-de-vendas', 'Controle de Vendas'],
  ['outras-informacoes', 'Outras Informações'],
  ['documentos', 'Documentos'],
  ['relatorios', 'Relatórios'],
] as const;

export type Aba = (typeof ABAS)[number][0];

/** As abas que têm campo para corrigir — para o ponto vermelho na aba. Aviso
 *  já corrigido (campo com erro vazio) não conta. */
export const abasComErro = (erros: ErrosDoFormulario): readonly Aba[] => [
  ...new Set(
    (Object.keys(erros) as (keyof FormularioDoCliente)[])
      .filter((campo) => Boolean(erros[campo]))
      .map((campo) => (ABA_DO_CAMPO[campo] ?? 'principal') as Aba),
  ),
];
