import type { Permission, PermissoesDaDecisao } from '@synapse/types';
import type { TenantContext } from '../../iam/iam.types';
import type { RoleService } from '../../iam/services/role.service';

/** Decidir e aprovar fora da politica sao permissoes diferentes.
 *
 *  - `financeiro.editar`: aprovar dentro da politica e reprovar.
 *  - `financeiro.credito.aprovarExcecao`: aprovar o que fere a politica, com
 *    justificativa. Pressupoe poder decidir — a rota de decisao exige
 *    `financeiro.editar` antes de tudo.
 *
 *  A permissao e binaria: nao ha alcada por valor. A tela recebe o resultado
 *  pronto na ficha e a API confere de novo em cada decisao. */
export const PERMISSAO_DE_DECIDIR: Permission = 'financeiro.editar';
export const PERMISSAO_DE_EXCECAO: Permission = 'financeiro.credito.aprovarExcecao';

export const SEM_PERMISSAO_DE_EXCECAO =
  'Esta operação exige aprovação excepcional. Você não possui permissão para essa decisão ' +
  `(${PERMISSAO_DE_EXCECAO}).`;

export const permissoesDaDecisao = (
  roles: Pick<RoleService, 'hasPermission'>,
  context: TenantContext,
): PermissoesDaDecisao => {
  const decidir = roles.hasPermission(context, PERMISSAO_DE_DECIDIR);
  return { decidir, aprovarExcecao: decidir && roles.hasPermission(context, PERMISSAO_DE_EXCECAO) };
};
