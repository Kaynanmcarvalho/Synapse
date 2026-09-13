import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AuditActor,
  Customer,
  CustomerId,
  PaginaDeClientes,
  PriceTableId,
  ReferenciaComercial,
  SugestoesDoCadastro,
  UserId,
} from '@synapse/types';
import type { ClienteInput } from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { ClienteRepository, paraLista } from '../repositories/cliente.repository';

/** O cadastro de clientes: criar, alterar, achar.
 *
 *  Uma regra que não é óbvia: a tela escolhe entre "liberado" e "bloqueado",
 *  mas não tira ninguém de inadimplente. `OVERDUE` é o financeiro que aponta,
 *  pelos títulos vencidos — salvar o cadastro não perdoa dívida. */

/** Quem criou um cadastro gravado antes desta tela não ficou registrado. Melhor
 *  dizer isso do que atribuir a criação a quem está editando agora. */
const CADASTRO_ANTERIOR: AuditActor = {
  uid: 'cadastro-anterior' as AuditActor['uid'],
  email: '',
  name: 'Cadastro anterior (autor não registrado)',
  source: 'api',
};

export interface FiltrosDeClientes {
  readonly termo?: string;
  readonly limite: number;
  readonly cursor?: string | null;
  readonly grupo?: string;
  readonly situacao?: Customer['financialStatus'];
  /** `true` mostra só ativos; `false`, só inativos; ausente, todos. */
  readonly ativo?: boolean;
}

@Injectable()
export class ClienteService {
  constructor(private readonly repositorio: ClienteRepository) {}

  async buscar(tenantId: string, id: string): Promise<Customer> {
    const cliente = await this.repositorio.buscar(tenantId, id);
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  /** `autor` é quem está logado, com nome e e-mail (o controller tira do token).
   *  Sem ele — teste, chamada interna —, a autoria fica só com o uid. */
  async criar(context: TenantContext, input: ClienteInput, autor?: AuditActor): Promise<Customer> {
    const agora = new Date().toISOString();
    const ator = autor ?? this.ator(context);
    const id = randomUUID() as CustomerId;
    return this.repositorio.criar({
      ...this.ficha(input, id, context.tenantId, ator, agora),
      openCredit: 0,
      codigo: null,
      createdAt: agora,
      createdBy: ator,
      updatedAt: agora,
      updatedBy: ator,
      version: 1,
    });
  }

  async atualizar(
    context: TenantContext,
    id: string,
    input: ClienteInput,
    autor?: AuditActor,
  ): Promise<Customer> {
    const anterior = await this.buscar(context.tenantId, id);
    const agora = new Date().toISOString();
    const ator = autor ?? this.ator(context);
    return this.repositorio.atualizar({
      ...this.ficha(input, anterior.id, context.tenantId, ator, agora, anterior),
      // O que a tela não edita fica como está: código, saldo em aberto e a
      // autoria da criação. Cadastro antigo (seed, tela antiga do crédito) não
      // tinha criação, versão nem saldo gravados.
      openCredit: anterior.openCredit ?? 0,
      codigo: anterior.codigo ?? null,
      createdAt: anterior.createdAt ?? anterior.updatedAt ?? agora,
      createdBy: anterior.createdBy ?? CADASTRO_ANTERIOR,
      updatedAt: agora,
      updatedBy: ator,
      version: (anterior.version ?? 0) + 1,
    });
  }

  async listar(tenantId: string, filtros: FiltrosDeClientes): Promise<PaginaDeClientes> {
    if (filtros.termo?.trim()) {
      const achados = await this.repositorio.procurar(tenantId, filtros.termo, filtros.limite * 3);
      const itens = achados.filter((cliente) => coube(cliente, filtros)).slice(0, filtros.limite);
      return { itens: itens.map(paraLista), proximoCursor: null, total: itens.length };
    }
    if (filtros.grupo || filtros.situacao || filtros.ativo !== undefined) {
      const todos = await this.repositorio.todos(tenantId);
      const filtrados = todos
        .filter((cliente) => coube(cliente, filtros))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return {
        itens: filtrados.slice(0, filtros.limite).map(paraLista),
        proximoCursor: null,
        total: filtrados.length,
      };
    }
    return this.repositorio.listar(tenantId, { limite: filtros.limite, cursor: filtros.cursor });
  }

  /** Busca curta para caixa de seleção (PDV, pedido, busca global). */
  async procurar(tenantId: string, termo: string, limite = 20): Promise<readonly Customer[]> {
    return this.repositorio.procurar(tenantId, termo, limite);
  }

  async todos(tenantId: string): Promise<readonly Customer[]> {
    return this.repositorio.todos(tenantId);
  }

  async buscarVarios(tenantId: string, ids: readonly string[]) {
    return this.repositorio.buscarVarios(tenantId, ids);
  }

  sugestoes(tenantId: string): Promise<SugestoesDoCadastro> {
    return this.repositorio.sugestoes(tenantId);
  }

  /** Situação financeira vinda do financeiro (inadimplência) ou da tela. */
  async definirSituacaoFinanceira(
    tenantId: string,
    id: string,
    status: Customer['financialStatus'],
    ator: AuditActor,
  ): Promise<Customer> {
    return this.repositorio.alterar(tenantId, id, (cliente) => ({
      ...cliente,
      financialStatus: status,
      updatedAt: new Date().toISOString(),
      updatedBy: ator,
      version: (cliente.version ?? 0) + 1,
    }));
  }

  /** LGPD §49: só anonimiza sem obrigação financeira em aberto. Devolve nulo
   *  quando a anonimização foi recusada. */
  async anonimizar(tenantId: string, id: string, ator: AuditActor): Promise<Customer | null> {
    const cliente = await this.buscar(tenantId, id);
    if ((cliente.openCredit ?? 0) > 0) return null;
    return this.repositorio.alterar(tenantId, id, (atual) => ({
      ...atual,
      name: 'Cliente anonimizado',
      legalName: null,
      taxId: '00000000000',
      phone: '',
      whatsapp: null,
      email: null,
      emailNfe: null,
      telefones: { principal: '', secundario: null, celular: null, whatsapp: null },
      address: { ...atual.address, street: '', number: '', complement: null },
      pessoaJuridica: null,
      referenciasComerciais: [],
      observacao: null,
      observacaoInterna: null,
      updatedAt: new Date().toISOString(),
      updatedBy: ator,
      version: (atual.version ?? 0) + 1,
    }));
  }

  /** O corpo validado vira a ficha gravada. As referências comerciais ganham
   *  id, autor e horário aqui: é informação de terceiro, e o rastro importa. */
  private ficha(
    input: ClienteInput,
    id: CustomerId,
    tenantId: string,
    ator: AuditActor,
    agora: string,
    anterior?: Customer,
  ): Omit<
    Customer,
    'openCredit' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'version' | 'codigo'
  > {
    return {
      id,
      tenantId: tenantId as Customer['tenantId'],
      type: input.type,
      taxId: input.taxId,
      stateRegistration: input.stateRegistration,
      municipalRegistration: input.municipalRegistration,
      name: input.name,
      legalName: input.legalName,
      address: input.address,
      phone: input.phone,
      whatsapp: input.whatsapp ?? null,
      email: input.email,
      creditLimit: input.creditLimit,
      responsibleSellerId: (input.responsibleSellerId as UserId | null) ?? null,
      priceTableId: (input.priceTableId as PriceTableId | null) ?? null,
      paymentTermId: input.paymentTermId,
      financialStatus: situacaoFinanceira(input.financialStatus, anterior),
      active: input.active,
      telefones: input.telefones,
      emailNfe: input.emailNfe,
      indicadorDeIe: input.indicadorDeIe,
      regimeTributario: input.regimeTributario,
      classificacao: input.classificacao,
      vendedorSecundarioId: (input.vendedorSecundarioId as UserId | null) ?? null,
      pessoaJuridica: input.type === 'PJ' ? (input.pessoaJuridica ?? null) : null,
      referenciasComerciais: input.referenciasComerciais.map((referencia) =>
        this.referencia(referencia, ator, agora, anterior),
      ),
      controleDeVendas: input.controleDeVendas,
      observacao: input.observacao,
      observacaoInterna: input.observacaoInterna,
      codigoIbgeDaCidade: input.codigoIbgeDaCidade,
      pais: input.pais,
    };
  }

  private referencia(
    entrada: ClienteInput['referenciasComerciais'][number],
    ator: AuditActor,
    agora: string,
    anterior?: Customer,
  ): ReferenciaComercial {
    const guardada = entrada.id
      ? anterior?.referenciasComerciais?.find((item) => item.id === entrada.id)
      : undefined;
    return {
      id: guardada?.id ?? entrada.id ?? randomUUID(),
      empresa: entrada.empresa,
      contato: entrada.contato,
      telefone: entrada.telefone,
      observacao: entrada.observacao,
      registradaEm: guardada?.registradaEm ?? agora,
      registradaPorNome: guardada?.registradaPorNome ?? (ator.name || ator.email || ator.uid),
    };
  }

  private ator(context: TenantContext): AuditActor {
    return { uid: context.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}

/** Inadimplência não se apaga pelo cadastro: quem estava `OVERDUE` só sai de lá
 *  pelo financeiro, ou quando a tela bloqueia de propósito. */
const situacaoFinanceira = (
  escolhida: 'REGULAR' | 'BLOCKED',
  anterior?: Customer,
): Customer['financialStatus'] =>
  anterior?.financialStatus === 'OVERDUE' && escolhida === 'REGULAR' ? 'OVERDUE' : escolhida;

const coube = (cliente: Customer, filtros: FiltrosDeClientes): boolean => {
  if (filtros.grupo && cliente.classificacao?.grupo !== filtros.grupo) return false;
  if (filtros.situacao && (cliente.financialStatus ?? 'REGULAR') !== filtros.situacao) return false;
  if (filtros.ativo !== undefined && (cliente.active ?? true) !== filtros.ativo) return false;
  return true;
};
