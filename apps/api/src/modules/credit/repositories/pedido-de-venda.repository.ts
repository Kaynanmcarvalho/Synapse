import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type {
  ObservacaoDoPedido,
  PedidoDeVenda,
  ResultadoDaLiberacao,
  SituacaoDoPedido,
} from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import {
  liberarPedido,
  motivoParaNaoLiberar,
  observarPedido,
  registrarImpressao,
  type Ator,
} from '../entities/historico';

const COLECAO = 'pedidosDeVenda';

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

  /** Libera varios pedidos de uma vez, numa transacao so: ou o analista ve o que
   *  passou e o que ficou, ou nada muda. Pedido que ja saiu da fila e recusado
   *  com o motivo, e nao liberado de novo. */
  async liberar(
    tenantId: string,
    ids: readonly string[],
    ator: Ator,
  ): Promise<ResultadoDaLiberacao> {
    const referencias = [...new Set(ids)].map((id) => this.colecao(tenantId).doc(id));
    return this.db.runTransaction(async (transacao) => {
      // Firestore exige todas as leituras antes da primeira escrita.
      const documentos = await Promise.all(referencias.map((ref) => transacao.get(ref)));
      const agora = new Date().toISOString();
      const liberados: string[] = [];
      const recusados: { pedidoId: string; motivo: string }[] = [];

      documentos.forEach((documento, indice) => {
        const referencia = referencias[indice];
        if (!referencia) return;
        const pedido = documento.exists ? (documento.data() as PedidoDeVenda) : null;
        const motivo = motivoParaNaoLiberar(pedido);
        if (motivo || !pedido) {
          recusados.push({ pedidoId: referencia.id, motivo: motivo ?? 'Pedido não encontrado' });
          return;
        }
        const liberado = liberarPedido(pedido, ator, agora);
        transacao.update(referencia, {
          situacao: liberado.situacao,
          analisadoEm: liberado.analisadoEm,
          analisadoPor: liberado.analisadoPor,
          historico: liberado.historico,
        });
        liberados.push(pedido.id);
      });

      return { liberados, recusados };
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

  async doCliente(tenantId: string, customerId: string, limite: number): Promise<PedidoDeVenda[]> {
    return this.dados(
      await this.colecao(tenantId)
        .where('customerId', '==', customerId)
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
