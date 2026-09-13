import { NotFoundException } from '@nestjs/common';
import type {
  CadastroDoCliente,
  PedidoDeVenda,
  ResultadoDaLiberacao,
  Titulo,
} from '@synapse/types';
import type { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { RoleService } from '../../iam/services/role.service';
import type { ClienteRepository } from '../repositories/cliente.repository';
import type {
  DecisaoDoLote,
  PedidoDeVendaRepository,
  RegraDoLote,
} from '../repositories/pedido-de-venda.repository';
import { AnaliseDeCreditoService } from '../services/analise-de-credito.service';
import { DecisaoDeCreditoService } from '../services/decisao-de-credito.service';
import { LeitorDeCredito } from '../services/leitor-de-credito';
import { cadastro, CLIENTE, pago, titulo } from './fixtures';

/** Os servicos de credito de ponta a ponta, com repositorios em memoria que
 *  imitam a semantica dos reais (inclusive os aprovados lidos na decisao). A
 *  concorrencia de verdade e testada contra o emulador do Firestore
 *  (concorrencia.emulador.spec.ts); aqui o foco e a regra e a permissao. */

export class PedidosEmMemoria {
  readonly dados = new Map<string, PedidoDeVenda>();
  private numero = 100;

  constructor(pedidos: readonly PedidoDeVenda[] = []) {
    for (const item of pedidos) this.dados.set(item.id, item);
  }

  private aprovadosDe(customerId: string) {
    return [...this.dados.values()].filter(
      (item) => item.customerId === customerId && item.situacao === 'APROVADO',
    );
  }

  proximoNumero = async () => (this.numero += 1);
  criar = async (novo: PedidoDeVenda) => {
    this.dados.set(novo.id, novo);
    return novo;
  };
  buscar = async (_t: string, id: string) => this.dados.get(id) ?? null;
  aguardandoAnalise = async () =>
    [...this.dados.values()].filter((item) => item.situacao === 'AGUARDANDO_ANALISE');
  aprovadosDosClientes = async (_t: string, ids: readonly string[]) =>
    [...this.dados.values()].filter(
      (item) => ids.includes(item.customerId) && item.situacao === 'APROVADO',
    );
  doCliente = async (_t: string, customerId: string) =>
    [...this.dados.values()].filter((item) => item.customerId === customerId);
  doClienteDesde = this.doCliente;
  doClientePorSituacao = async (_t: string, customerId: string, situacao: string) =>
    [...this.dados.values()].filter(
      (item) => item.customerId === customerId && item.situacao === situacao,
    );

  decidir = async (
    _t: string,
    id: string,
    regra: (lido: PedidoDeVenda, aprovados: readonly PedidoDeVenda[]) => PedidoDeVenda,
  ) => {
    const lido = this.dados.get(id);
    if (!lido) throw new NotFoundException('Pedido não encontrado');
    const decidido = regra(lido, this.aprovadosDe(lido.customerId));
    this.dados.set(id, decidido);
    return decidido;
  };

  liberar = async (
    _t: string,
    ids: readonly string[],
    regra: RegraDoLote,
  ): Promise<ResultadoDaLiberacao> => {
    const lidos = new Map(ids.map((id) => [id, this.dados.get(id) ?? null]));
    const clientes = [
      ...new Set([...lidos.values()].flatMap((item) => (item ? [item.customerId] : []))),
    ];
    const decisoes = regra(
      lidos,
      clientes.flatMap((id) => this.aprovadosDe(id)),
    );
    const resultado = {
      liberados: [] as string[],
      excepcionais: [] as string[],
      recusados: [] as { pedidoId: string; motivo: string }[],
    };
    for (const id of ids) {
      const decisao: DecisaoDoLote = decisoes.get(id) ?? { motivo: 'Pedido não avaliado' };
      if ('motivo' in decisao) resultado.recusados.push({ pedidoId: id, motivo: decisao.motivo });
      else {
        this.dados.set(id, decisao.pedido);
        resultado.liberados.push(id);
        if (decisao.excepcional) resultado.excepcionais.push(id);
      }
    }
    return resultado;
  };
}

export class TitulosEmMemoria {
  chamadasEmLote = 0;
  chamadasPorCliente = 0;
  constructor(public dados: readonly Titulo[] = []) {}
  listByCliente = async (_t: string, customerId: string) => {
    this.chamadasPorCliente += 1;
    return this.dados.filter((item) => item.customerId === customerId);
  };
  listByClientes = async (_t: string, ids: readonly string[]) => {
    this.chamadasEmLote += 1;
    return this.dados.filter((item) => item.customerId && ids.includes(item.customerId));
  };
}

export class ClientesEmMemoria {
  constructor(private readonly dados: ReadonlyMap<string, CadastroDoCliente>) {}
  buscar = async (_t: string, id: string) => this.dados.get(id) ?? null;
  buscarVarios = async (_t: string, ids: readonly string[]) =>
    new Map(
      ids.flatMap((id) => (this.dados.has(id) ? [[id, this.dados.get(id)]] : [])) as [
        string,
        CadastroDoCliente,
      ][],
    );
}

/** Um usuario do tenant com as roles dadas. */
export const contextoCom = (...roleIds: string[]): TenantContext => ({
  tenantId: 'tenant-1',
  userId: 'analista-1',
  roleIds,
  branchIds: [],
  warehouseIds: [],
});

/** Administrador: decide e aprova excecao. */
export const CONTEXTO = contextoCom('ADMIN_EMPRESA');
/** Financeiro: decide dentro da politica, mas nao aprova excecao. */
export const FINANCEIRO = contextoCom('FINANCEIRO');
export const ANALISTA = { uid: 'analista-1', nome: 'João Crédito' };
export const JUSTIFICATIVA = 'Cliente antecipou o pagamento do mês por PIX.';

/** Cliente com limite de R$ 10.000 e R$ 4.000 em aberto: cabe R$ 6.000. */
export const montar = (
  pedidos: readonly PedidoDeVenda[],
  extras: { titulos?: Titulo[]; cadastros?: Map<string, CadastroDoCliente> } = {},
) => {
  const repositorioDePedidos = new PedidosEmMemoria(pedidos);
  const titulos = new TitulosEmMemoria(
    extras.titulos ?? [
      titulo({ id: 'aberto', valorOriginalCentavos: 400_000, vencimento: '2099-01-01' }),
      ...['a', 'b', 'c', 'd', 'e'].map((id) => pago(id, '2026-08-01', 0)),
    ],
  );
  const clientes = new ClientesEmMemoria(extras.cadastros ?? new Map([[CLIENTE, cadastro()]]));
  const p = repositorioDePedidos as unknown as PedidoDeVendaRepository;
  const t = titulos as unknown as TituloRepository;
  const c = clientes as unknown as ClienteRepository;
  const leitor = new LeitorDeCredito(p, t, c);
  // As permissoes sao as reais: o catalogo de roles padrao do IAM.
  const roles = new RoleService(new RoleRepository());
  return {
    pedidos: repositorioDePedidos,
    titulos,
    roles,
    analise: new AnaliseDeCreditoService(p, t, c, leitor, roles),
    decisoes: new DecisaoDeCreditoService(p, t, c, leitor, roles),
  };
};
