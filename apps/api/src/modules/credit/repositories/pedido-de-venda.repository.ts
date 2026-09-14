import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot, Transaction } from '@synapse/firebase/admin';
import type {
  ObservacaoDoPedido,
  PedidoDeVenda,
  ResultadoDaLiberacao,
  SituacaoDoPedido,
} from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import {
  observarPedido,
  registrarImpressao,
  registrarVisualizacao,
  type Ator,
} from '../entities/historico';

const COLECAO = 'pedidosDeVenda';

/** Trava de credito por cliente: `tenants/{t}/travasDeCredito/{customerId}`.
 *
 *  Toda decisao de credito le e grava o documento do cliente na mesma
 *  transacao. Dois analistas aprovando pedidos diferentes do mesmo cliente
 *  passam a disputar o mesmo documento: o Firestore confirma um e faz o outro
 *  recomecar, e a segunda tentativa rele os aprovados ja com o primeiro gravado.
 *  Assim a garantia nao depende de trava de intervalo em consulta — so de
 *  documento, que e o que o Firestore garante em qualquer ambiente. */
const TRAVAS = 'travasDeCredito';

/** O que a regra de decisao devolve para cada pedido do lote: o pedido
 *  alterado, ou o motivo de ter ficado de fora. */
export type DecisaoDoLote =
  { readonly pedido: PedidoDeVenda; readonly excepcional: boolean } | { readonly motivo: string };

/** Regra que decide o lote dentro da transacao, com os pedidos e os aprovados
 *  do cliente lidos na mesma transacao — assim dois analistas aprovando ao
 *  mesmo tempo nao usam o mesmo limite duas vezes. */
export type RegraDoLote = (
  pedidos: ReadonlyMap<string, PedidoDeVenda | null>,
  aprovados: readonly PedidoDeVenda[],
) => ReadonlyMap<string, DecisaoDoLote>;

/** Guarda os pedidos que chegam do vendedor. Precisa ser persistente: um pedido
 *  que some no restart e um pedido que o cliente cobra e ninguem acha. */
@Injectable()
export class PedidoDeVendaRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private colecao(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/${COLECAO}`);
  }

  private dados(snapshot: { docs: QueryDocumentSnapshot[] }): PedidoDeVenda[] {
    return snapshot.docs.map((documento) => documento.data() as PedidoDeVenda);
  }

  /** Numero sequencial do pedido, em transacao: dois vendedores enviando ao
   *  mesmo tempo nao recebem o mesmo numero. */
  async proximoNumero(tenantId: string): Promise<number> {
    const referencia = this.db.doc(`tenants/${tenantId}/contadores/${COLECAO}`);
    return this.db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referencia);
      const ultimo = (documento.data()?.['ultimo'] as number | undefined) ?? 0;
      const numero = ultimo + 1;
      transacao.set(referencia, { ultimo: numero });
      return numero;
    });
  }

  async criar(pedido: PedidoDeVenda): Promise<PedidoDeVenda> {
    await this.colecao(pedido.tenantId).doc(pedido.id).create(pedido);
    return pedido;
  }

  /** Marca (ou desmarca) o pedido como impresso para um usuario. Em transacao:
   *  dois usuarios imprimindo ao mesmo tempo nao apagam a marca um do outro. */
  async marcarImpressao(
    tenantId: string,
    id: string,
    ator: Ator,
    impresso: boolean,
  ): Promise<PedidoDeVenda> {
    return this.alterar(tenantId, id, (pedido) =>
      registrarImpressao(pedido, ator, new Date().toISOString(), impresso),
    );
  }

  async observar(
    tenantId: string,
    id: string,
    observacao: ObservacaoDoPedido,
  ): Promise<PedidoDeVenda> {
    return this.alterar(tenantId, id, (pedido) => observarPedido(pedido, observacao));
  }

  /** "Fulano abriu a analise": grava so se a mesma pessoa nao abriu ha pouco. */
  async registrarVisualizacao(tenantId: string, id: string, ator: Ator): Promise<boolean> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referencia);
      if (!documento.exists) throw new NotFoundException('Pedido não encontrado');
      const visto = registrarVisualizacao(
        documento.data() as PedidoDeVenda,
        ator,
        new Date().toISOString(),
      );
      if (!visto) return false;
      transacao.update(referencia, { historico: visto.historico });
      return true;
    });
  }

  private trava(tenantId: string, customerId: string) {
    return this.db.doc(`tenants/${tenantId}/${TRAVAS}/${customerId}`);
  }

  /** Le a trava de cada cliente — antes de qualquer escrita, como o Firestore exige. */
  private async lerTravas(
    transacao: Transaction,
    tenantId: string,
    clientes: readonly string[],
  ): Promise<Map<string, number>> {
    const lidas = await Promise.all(
      clientes.map((customerId) => transacao.get(this.trava(tenantId, customerId))),
    );
    return new Map(
      clientes.map((customerId, indice) => [
        customerId,
        (lidas[indice]?.data()?.['versao'] as number | undefined) ?? 0,
      ]),
    );
  }

  /** Grava a trava do cliente com a versao seguinte e o pedido que a moveu. */
  private gravarTrava(
    transacao: Transaction,
    tenantId: string,
    customerId: string,
    versaoLida: number,
    pedidoId: string,
  ): void {
    transacao.set(this.trava(tenantId, customerId), {
      customerId,
      versao: versaoLida + 1,
      ultimoPedidoId: pedidoId,
      atualizadoEm: new Date().toISOString(),
    });
  }

  private aprovadosNaTransacao(
    transacao: Transaction,
    tenantId: string,
    clientes: readonly string[],
  ): Promise<PedidoDeVenda[]> {
    return Promise.all(
      clientes.map((customerId) =>
        transacao.get(
          this.colecao(tenantId)
            .where('customerId', '==', customerId)
            .where('situacao', '==', 'APROVADO')
            .orderBy('enviadoEm', 'desc')
            .limit(500),
        ),
      ),
    ).then((resultados) => resultados.flatMap((resultado) => this.dados(resultado)));
  }

  /** Decide varios pedidos numa transacao so: ou o analista ve o que passou e o
   *  que ficou, ou nada muda. A regra recebe os pedidos e os aprovados do
   *  cliente lidos agora, dentro da transacao. */
  async liberar(
    tenantId: string,
    ids: readonly string[],
    regra: RegraDoLote,
  ): Promise<ResultadoDaLiberacao> {
    const referencias = [...new Set(ids)].map((id) => this.colecao(tenantId).doc(id));
    return this.db.runTransaction(async (transacao) => {
      // Firestore exige todas as leituras antes da primeira escrita.
      const documentos = await Promise.all(referencias.map((ref) => transacao.get(ref)));
      const pedidos = new Map(
        documentos.map((documento, indice) => [
          referencias[indice]?.id ?? documento.id,
          documento.exists ? (documento.data() as PedidoDeVenda) : null,
        ]),
      );
      const clientes = [
        ...new Set([...pedidos.values()].flatMap((pedido) => (pedido ? [pedido.customerId] : []))),
      ];
      const travas = await this.lerTravas(transacao, tenantId, clientes);
      const aprovados = await this.aprovadosNaTransacao(transacao, tenantId, clientes);
      const decisoes = regra(pedidos, aprovados);
      const movidos = new Map<string, string>();

      const liberados: string[] = [];
      const excepcionais: string[] = [];
      const recusados: { pedidoId: string; motivo: string }[] = [];
      for (const referencia of referencias) {
        const decisao = decisoes.get(referencia.id) ?? { motivo: 'Pedido não avaliado' };
        if ('motivo' in decisao) {
          recusados.push({ pedidoId: referencia.id, motivo: decisao.motivo });
          continue;
        }
        transacao.update(referencia, {
          situacao: decisao.pedido.situacao,
          analisadoEm: decisao.pedido.analisadoEm,
          analisadoPor: decisao.pedido.analisadoPor,
          historico: decisao.pedido.historico,
        });
        liberados.push(referencia.id);
        if (decisao.excepcional) excepcionais.push(referencia.id);
        movidos.set(decisao.pedido.customerId, referencia.id);
      }
      for (const [customerId, pedidoId] of movidos) {
        this.gravarTrava(transacao, tenantId, customerId, travas.get(customerId) ?? 0, pedidoId);
      }
      return { liberados, excepcionais, recusados };
    });
  }

  /** Uma decisao sobre um pedido (aprovar, aprovar excepcionalmente, reprovar),
   *  em transacao, com a trava e os aprovados do cliente lidos na mesma
   *  transacao. A regra lanca excecao quando a decisao nao pode ser tomada — e
   *  nesse caso nada e gravado. Se outra decisao do mesmo cliente (ou do mesmo
   *  pedido) confirmar antes, esta recomeca e a regra roda de novo com os dados
   *  novos: a segunda aprovacao ve o limite ja usado, e a segunda decisao do
   *  mesmo pedido ve que ele ja foi decidido. */
  async decidir(
    tenantId: string,
    id: string,
    regra: (pedido: PedidoDeVenda, aprovados: readonly PedidoDeVenda[]) => PedidoDeVenda,
  ): Promise<PedidoDeVenda> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referencia);
      if (!documento.exists) throw new NotFoundException('Pedido não encontrado');
      const pedido = documento.data() as PedidoDeVenda;
      const travas = await this.lerTravas(transacao, tenantId, [pedido.customerId]);
      const aprovados = await this.aprovadosNaTransacao(transacao, tenantId, [pedido.customerId]);
      const decidido = regra(pedido, aprovados);
      transacao.update(referencia, {
        situacao: decidido.situacao,
        analisadoEm: decidido.analisadoEm,
        analisadoPor: decidido.analisadoPor,
        historico: decidido.historico,
      });
      this.gravarTrava(
        transacao,
        tenantId,
        pedido.customerId,
        travas.get(pedido.customerId) ?? 0,
        id,
      );
      return decidido;
    });
  }

  /** Le, aplica a regra e grava, em transacao: duas pessoas mexendo no mesmo
   *  pedido nao apagam o que a outra acabou de fazer. */
  private async alterar(
    tenantId: string,
    id: string,
    regra: (pedido: PedidoDeVenda) => PedidoDeVenda,
  ): Promise<PedidoDeVenda> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referencia);
      if (!documento.exists) throw new NotFoundException('Pedido não encontrado');
      const alterado = regra(documento.data() as PedidoDeVenda);
      transacao.set(referencia, alterado);
      return alterado;
    });
  }

  async buscar(tenantId: string, id: string): Promise<PedidoDeVenda | null> {
    const documento = await this.colecao(tenantId).doc(id).get();
    return documento.exists ? (documento.data() as PedidoDeVenda) : null;
  }

  /** A fila da tela: tudo que espera analise, do mais recente para o mais antigo. */
  async aguardandoAnalise(tenantId: string, limite: number): Promise<PedidoDeVenda[]> {
    return this.dados(
      await this.colecao(tenantId)
        .where('situacao', '==', 'AGUARDANDO_ANALISE')
        .orderBy('enviadoEm', 'desc')
        .limit(limite)
        .get(),
    );
  }

  /** Aprovados dos clientes da fila, em lotes de 30 (limite do `in`): a fila
   *  soma o que ja esta comprometido sem uma consulta por cliente. */
  async aprovadosDosClientes(
    tenantId: string,
    customerIds: readonly string[],
  ): Promise<PedidoDeVenda[]> {
    const unicos = [...new Set(customerIds)];
    const lotes: string[][] = [];
    for (let inicio = 0; inicio < unicos.length; inicio += 30) {
      lotes.push(unicos.slice(inicio, inicio + 30));
    }
    const resultados = await Promise.all(
      lotes.map((lote) =>
        this.colecao(tenantId)
          .where('customerId', 'in', lote)
          .where('situacao', '==', 'APROVADO')
          .get(),
      ),
    );
    return resultados.flatMap((resultado) => this.dados(resultado));
  }

  /** Pedidos por vendedor (funcionário ou login) ou por origem (BALCAO), do
   *  mais novo para o mais antigo. */
  async porCampo(
    tenantId: string,
    campo: 'funcionarioId' | 'vendedorId' | 'origem',
    valor: string,
    desde: string | null,
    limite: number,
  ): Promise<PedidoDeVenda[]> {
    let consulta = this.colecao(tenantId).where(campo, '==', valor);
    if (desde) consulta = consulta.where('enviadoEm', '>=', desde);
    return this.dados(await consulta.orderBy('enviadoEm', 'desc').limit(limite).get());
  }

  async doCliente(tenantId: string, customerId: string, limite: number): Promise<PedidoDeVenda[]> {
    return this.dados(
      await this.colecao(tenantId)
        .where('customerId', '==', customerId)
        .orderBy('enviadoEm', 'desc')
        .limit(limite)
        .get(),
    );
  }

  /** Pedidos do cliente desde uma data — a base do comportamento de compra. */
  async doClienteDesde(
    tenantId: string,
    customerId: string,
    desde: string,
    limite = 2000,
  ): Promise<PedidoDeVenda[]> {
    return this.dados(
      await this.colecao(tenantId)
        .where('customerId', '==', customerId)
        .where('enviadoEm', '>=', desde)
        .orderBy('enviadoEm', 'desc')
        .limit(limite)
        .get(),
    );
  }

  async doClientePorSituacao(
    tenantId: string,
    customerId: string,
    situacao: SituacaoDoPedido,
    limite: number,
  ): Promise<PedidoDeVenda[]> {
    return this.dados(
      await this.colecao(tenantId)
        .where('customerId', '==', customerId)
        .where('situacao', '==', situacao)
        .orderBy('enviadoEm', 'desc')
        .limit(limite)
        .get(),
    );
  }
}
