import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ItemDeTabela, Permission, ReferenciaDeTabela, TipoDeTabela } from '@synapse/types';
import type { ItemDeTabelaInput } from '@synapse/validation';
import type { TenantContext } from '../../iam/iam.types';
import { RoleService } from '../../iam/services/role.service';
import { TabelaRepository } from './tabela.repository';

/** Quem pode criar ou renomear itens de cada tabela. Ler é de todo membro do
 *  tenant: o PDV precisa das formas de pagamento, a ficha do fornecedor das
 *  praças — e ninguém escolhe item de uma lista que não consegue ver. */
const QUEM_ESCREVE: Readonly<Record<TipoDeTabela, readonly Permission[]>> = {
  cargos: ['funcionario.gerenciar'],
  departamentos: ['funcionario.gerenciar'],
  pracas: ['funcionario.gerenciar', 'fornecedor.gerenciar', 'cliente.gerenciar'],
  'grupos-de-fornecedor': ['fornecedor.gerenciar'],
  'subgrupos-de-fornecedor': ['fornecedor.gerenciar'],
  'formas-de-pagamento': ['financeiro.editar'],
};

@Injectable()
export class TabelaService {
  constructor(
    private readonly repositorio: TabelaRepository,
    private readonly roles: RoleService,
  ) {}

  async listar(
    context: TenantContext,
    tipo: TipoDeTabela,
    filtros: { readonly termo?: string; readonly somenteAtivos?: boolean } = {},
  ): Promise<ItemDeTabela[]> {
    const itens = await this.repositorio.listar(context.tenantId, tipo);
    const termo = filtros.termo?.trim().toLocaleUpperCase('pt-BR');
    return itens.filter(
      (item) =>
        (!filtros.somenteAtivos || item.ativo) &&
        (!termo || item.nome.includes(termo) || String(item.codigo) === termo),
    );
  }

  async buscar(context: TenantContext, tipo: TipoDeTabela, codigo: number): Promise<ItemDeTabela> {
    const item = await this.repositorio.buscar(context.tenantId, tipo, codigo);
    if (!item) throw new NotFoundException(`Código ${codigo} não existe nesta tabela`);
    return item;
  }

  /** Confere a referência que chegou numa ficha: o código existe e está ativo.
   *  Devolve o nome gravado agora — o que a tela mandou pode estar velho. */
  async referencia(
    context: TenantContext,
    tipo: TipoDeTabela,
    referencia: ReferenciaDeTabela,
    rotulo: string,
  ): Promise<ReferenciaDeTabela> {
    const item = await this.repositorio.buscar(context.tenantId, tipo, referencia.codigo);
    if (!item) throw new BadRequestException(`${rotulo}: código ${referencia.codigo} não existe`);
    if (!item.ativo && item.nome !== referencia.nome)
      throw new BadRequestException(`${rotulo}: ${item.codigo} - ${item.nome} está inativo`);
    return { codigo: item.codigo, nome: item.nome };
  }

  async criar(
    context: TenantContext,
    tipo: TipoDeTabela,
    input: ItemDeTabelaInput,
  ): Promise<ItemDeTabela> {
    this.exigirPermissao(context, tipo);
    return this.repositorio.criar(context.tenantId, tipo, input, context.userId);
  }

  async alterar(
    context: TenantContext,
    tipo: TipoDeTabela,
    codigo: number,
    input: ItemDeTabelaInput,
  ): Promise<ItemDeTabela> {
    this.exigirPermissao(context, tipo);
    if (codigo === 1 && !input.ativo && tipo !== 'formas-de-pagamento')
      throw new BadRequestException(
        'O código 1 é o padrão das fichas novas e não pode ser inativado',
      );
    return this.repositorio.alterar(context.tenantId, tipo, codigo, input, context.userId);
  }

  private exigirPermissao(context: TenantContext, tipo: TipoDeTabela): void {
    const permitidas = QUEM_ESCREVE[tipo];
    if (!permitidas.some((permissao) => this.roles.hasPermission(context, permissao)))
      throw new ForbiddenException(`Permissão necessária: ${permitidas.join(' ou ')}`);
  }
}
