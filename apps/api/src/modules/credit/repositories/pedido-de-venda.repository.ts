import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot } from '@synapse/firebase/admin';
import type { PedidoDeVenda, SituacaoDoPedido } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

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
    userId: string,
    impresso: boolean,
  ): Promise<PedidoDeVenda> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const documento = await transacao.get(referencia);
      if (!documento.exists) throw new NotFoundException('Pedido não encontrado');
      const pedido = documento.data() as PedidoDeVenda;
      const marcas = new Set(pedido.impressoPor ?? []);
      if (impresso) marcas.add(userId as PedidoDeVenda['impressoPor'][number]);
      else marcas.delete(userId as PedidoDeVenda['impressoPor'][number]);
      const impressoPor = [...marcas];
      transacao.update(referencia, { impressoPor });
      return { ...pedido, impressoPor };
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
