/** Catalogo de permissoes no formato `modulo.operacao` (§3).
 *  Uma lista fechada: adicionar uma permissao nova e uma decisao de produto,
 *  nao um detalhe de implementacao — por isso o tipo e um union literal, nao string. */
export const PERMISSIONS = [
  'produto.visualizar',
  'produto.criar',
  'produto.editar',
  'produto.excluir',
  'produto.importar',
  'estoque.visualizar',
  'estoque.ajustar',
  'estoque.transferir',
  'estoque.inventariar',
  'venda.criar',
  'venda.editar',
  'venda.cancelar',
  'venda.aprovarDesconto',
  'fiscal.emitir',
  'fiscal.cancelar',
  'fiscal.visualizar',
  'fiscal.configurar',
  'financeiro.visualizar',
  'financeiro.editar',
  'financeiro.conciliar',
  'filial.gerenciar',
  'filial.configurar',
  'cargo.gerenciar',
  'usuario.gerenciar',
  'preco.gerenciar',
  'preco.negociarExtra',
  'cliente.gerenciar',
  'fornecedor.gerenciar',
  'auditoria.visualizar',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

/** A que nivel uma concessao de permissao se aplica. Vazio (undefined) = todos. */
export interface PermissionScope {
  readonly branchIds?: readonly string[];
  readonly warehouseIds?: readonly string[];
}

export interface PermissionGrant {
  readonly permission: Permission;
  readonly scope?: PermissionScope;
}
