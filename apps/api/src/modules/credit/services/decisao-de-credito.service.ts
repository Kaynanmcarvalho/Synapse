import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  AvaliacaoDoPedido,
  DecisaoDeCreditoInput,
  PedidoDeVenda,
  ResultadoDaDecisao,
  ResultadoDaLiberacao,
  SituacaoDeCredito,
} from '@synapse/types';
import {
  avaliarLote,
  exposicaoDoPedido,
  JUSTIFICATIVA_MINIMA,
  justificativaValida,
  type ItemDoLote,
} from '@synapse/validation';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { RoleService } from '../../iam/services/role.service';
import { avaliarPedido } from '../entities/avaliacao';
import { comportamentoFinanceiro, pontualidadeRecente } from '../entities/comportamento';
import {
  liberarPedido,
  motivoParaNaoLiberar,
  reprovarPedido,
  type Ator,
} from '../entities/historico';
import { ClienteRepository } from '../repositories/cliente.repository';
import {
  PedidoDeVendaRepository,
  type DecisaoDoLote,
} from '../repositories/pedido-de-venda.repository';
import { hojeNaOperacao, LeitorDeCredito, type DadosDeCredito } from './leitor-de-credito';
import { permissoesDaDecisao, SEM_PERMISSAO_DE_EXCECAO } from './permissoes-do-credito';

const EXIGE_JUSTIFICATIVA = `Justificativa obrigatória, com pelo menos ${JUSTIFICATIVA_MINIMA} caracteres.`;

const rotulos = (avaliacao: Pick<AvaliacaoDoPedido, 'motivos'>): string =>
  avaliacao.motivos
    .filter((motivo) => motivo.violaPolitica)
    .map((motivo) => motivo.rotulo.toLowerCase())
    .join(', ');

/** Quem decide o lote e com que poder. */
interface QuemDecide {
  readonly ator: Ator;
  readonly em: string;
  readonly justificativa: string | null;
  readonly podeAprovarExcecao: boolean;
}

/** Por que um pedido do lote fica de fora — ou nulo, se passa. Fora da
 *  politica so passa quem pode aprovar excecao e escreveu a justificativa: a
 *  justificativa sozinha nao abre a porta para quem nao tem a permissao. */
const recusaNoLote = (pedido: PedidoDeVenda, item: ItemDoLote, quem: QuemDecide): string | null => {
  if (!item.violaPolitica) return null;
  const fora = `Pedido ${pedido.numero} fora da política (${rotulos(item)})`;
  if (!quem.podeAprovarExcecao) {
    return `${fora}: exige aprovação excepcional, e você não possui permissão para essa decisão.`;
  }
  if (!justificativaValida(quem.justificativa)) return `${fora}: aprove com justificativa.`;
  return null;
};

/** Aprovar, aprovar excepcionalmente e reprovar. A API refaz a avaliacao no
 *  momento da decisao, com os dados lidos na mesma transacao que grava: a tela
 *  pode estar desatualizada, a regra nao. Fora da politica, so passa por quem
 *  tem `financeiro.credito.aprovarExcecao` e com justificativa — e a
 *  justificativa fica no rastro do pedido para sempre. Esconder o botao na tela
 *  e conveniencia; quem garante e esta classe. */
@Injectable()
export class DecisaoDeCreditoService {
  constructor(
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly titulos: TituloRepository,
    private readonly clientes: ClienteRepository,
    private readonly leitor: LeitorDeCredito,
    private readonly roles: RoleService,
  ) {}

  private avaliar(
    pedido: PedidoDeVenda,
    dados: DadosDeCredito,
    doAno: readonly PedidoDeVenda[],
    agora: Date,
  ): AvaliacaoDoPedido {
    const hoje = hojeNaOperacao(agora);
    const situacao = this.leitor.situacao(pedido.customerId, dados, agora);
    const comportamento = comportamentoFinanceiro({
      customerId: pedido.customerId,
      titulos: dados.titulos,
      pedidos: doAno,
      parametros: this.leitor.parametros,
      hoje,
      identificar: (titulo) => titulo.id,
    });
    return avaliarPedido(
      pedido,
      situacao,
      comportamento,
      pontualidadeRecente(dados.titulos, pedido.customerId),
      this.leitor.parametros,
    );
  }

  async decidir(
    context: TenantContext,
    ator: Ator,
    id: string,
    input: DecisaoDeCreditoInput,
  ): Promise<ResultadoDaDecisao> {
    const justificativa = input.justificativa?.trim() || null;
    // A permissao vem antes da justificativa: sem ela, nenhum texto adianta.
    const { aprovarExcecao } = permissoesDaDecisao(this.roles, context);
    if (input.acao === 'APROVAR_EXCECAO' && !aprovarExcecao) {
      throw new ForbiddenException(SEM_PERMISSAO_DE_EXCECAO);
    }
    if (input.acao !== 'APROVAR' && !justificativaValida(justificativa)) {
      throw new BadRequestException(EXIGE_JUSTIFICATIVA);
    }
    const atual = await this.pedidos.buscar(context.tenantId, id);
    if (!atual) throw new NotFoundException('Pedido não encontrado');
    const desde = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const [titulos, cadastro, doAno] = await Promise.all([
      this.titulos.listByCliente(context.tenantId, atual.customerId),
      this.clientes.buscar(context.tenantId, atual.customerId),
      this.pedidos.doClienteDesde(context.tenantId, atual.customerId, desde),
    ]);

    let avaliacao: AvaliacaoDoPedido | null = null;
    const pedido = await this.pedidos.decidir(context.tenantId, id, (lido, aprovados) => {
      const impedimento = motivoParaNaoLiberar(lido);
      if (impedimento) throw new ConflictException(impedimento);
      const agora = new Date();
      const feita = this.avaliar(lido, { titulos, cadastro, aprovados }, doAno, agora);
      avaliacao = feita;
      const contexto = {
        excepcional: feita.violaPolitica,
        justificativa,
        motivos: feita.motivos,
        impacto: feita.impacto,
      };
      if (input.acao === 'REPROVAR')
        return reprovarPedido(lido, ator, agora.toISOString(), contexto);
      if (input.acao === 'APROVAR' && feita.violaPolitica) {
        throw new UnprocessableEntityException(
          `Pedido ${lido.numero} está fora da política de crédito (${rotulos(feita)}). ` +
            (aprovarExcecao
              ? 'Use a aprovação excepcional, com justificativa.'
              : 'Esta operação exige aprovação excepcional, e você não possui permissão para essa decisão.'),
        );
      }
      return liberarPedido(lido, ator, agora.toISOString(), contexto);
    });

    if (!avaliacao) throw new ConflictException('A decisão não foi avaliada');
    return { pedido, avaliacao };
  }

  /** Liberacao em lote dos pedidos marcados. Consome o limite do mais antigo
   *  para o mais recente — a mesma regra que a tela usa para dizer quantos vao
   *  precisar de aprovacao excepcional. Esses so passam com justificativa e com
   *  a permissao de excecao; sem uma delas, ficam de fora com o motivo. */
  async liberar(
    context: TenantContext,
    ator: Ator,
    ids: readonly string[],
    justificativaInformada: string | null,
  ): Promise<ResultadoDaLiberacao> {
    const { tenantId } = context;
    const justificativa = justificativaInformada?.trim() || null;
    const { aprovarExcecao } = permissoesDaDecisao(this.roles, context);
    const lidos = await Promise.all(ids.map((id) => this.pedidos.buscar(tenantId, id)));
    const clientes = [...new Set(lidos.flatMap((pedido) => (pedido ? [pedido.customerId] : [])))];
    const [titulos, cadastros] = await Promise.all([
      this.titulos.listByClientes(tenantId, clientes),
      this.clientes.buscarVarios(tenantId, clientes),
    ]);

    return this.pedidos.liberar(tenantId, ids, (pedidos, aprovados) => {
      const agora = new Date();
      const decisoes = new Map<string, DecisaoDoLote>();
      const validos: PedidoDeVenda[] = [];
      for (const [id, pedido] of pedidos) {
        const impedimento = motivoParaNaoLiberar(pedido);
        if (impedimento || !pedido)
          decisoes.set(id, { motivo: impedimento ?? 'Pedido não encontrado' });
        else validos.push(pedido);
      }

      const quem: QuemDecide = {
        ator,
        em: agora.toISOString(),
        justificativa,
        podeAprovarExcecao: aprovarExcecao,
      };
      for (const customerId of new Set(validos.map((pedido) => pedido.customerId))) {
        const situacao = this.leitor.situacao(
          customerId,
          {
            titulos: titulos.filter((titulo) => titulo.customerId === customerId),
            cadastro: cadastros.get(customerId) ?? null,
            aprovados,
          },
          agora,
        );
        const doCliente = validos.filter((pedido) => pedido.customerId === customerId);
        this.decidirDoCliente(situacao, doCliente, quem, decisoes);
      }
      return decisoes;
    });
  }

  /** Os pedidos de um cliente no lote, do mais antigo para o mais recente. */
  private decidirDoCliente(
    situacao: SituacaoDeCredito,
    doCliente: readonly PedidoDeVenda[],
    quem: QuemDecide,
    decisoes: Map<string, DecisaoDoLote>,
  ): void {
    const lote = avaliarLote(
      situacao,
      doCliente.map((pedido) => ({
        pedidoId: pedido.id,
        enviadoEm: pedido.enviadoEm,
        exposicao: exposicaoDoPedido(pedido),
      })),
      this.leitor.parametros,
    );
    for (const item of lote.itens) {
      const pedido = doCliente.find((candidato) => candidato.id === item.pedidoId);
      if (!pedido) continue;
      const recusa = recusaNoLote(pedido, item, quem);
      if (recusa) {
        decisoes.set(pedido.id, { motivo: recusa });
        continue;
      }
      decisoes.set(pedido.id, {
        excepcional: item.violaPolitica,
        pedido: liberarPedido(pedido, quem.ator, quem.em, {
          excepcional: item.violaPolitica,
          justificativa: item.violaPolitica ? quem.justificativa : null,
          motivos: item.motivos,
          impacto: item.impacto,
        }),
      });
    }
  }

  /** "Fulano abriu a analise" — no maximo um registro por pessoa a cada meia hora. */
  async visualizar(context: TenantContext, ator: Ator, id: string) {
    return { registrado: await this.pedidos.registrarVisualizacao(context.tenantId, id, ator) };
  }
}
