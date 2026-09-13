import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BankAccountConfig,
  DetalheDaNota,
  DetalheDoPedido,
  DetalheDoTitulo,
} from '@synapse/types';
import { BoletoRepository } from '../../finance/repositories/boleto.repository';
import { TituloRepository } from '../../finance/repositories/titulo.repository';
import type { TenantContext } from '../../iam/iam.types';
import { detalheDaNota, detalheDoPedido, detalheDoTitulo } from '../entities/documentos';
import { PedidoDeVendaRepository } from '../repositories/pedido-de-venda.repository';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { hojeNaOperacao } from './leitor-de-credito';

/** Os documentos que a lupa abre. Cada um e lido so quando o analista clica:
 *  a ficha nao carrega boleto e liquidacao de 150 titulos que ninguem vai abrir. */
@Injectable()
export class DocumentosDoCreditoService {
  constructor(
    private readonly pedidos: PedidoDeVendaRepository,
    private readonly titulos: TituloRepository,
    private readonly boletos: BoletoRepository,
    private readonly usuarios: UsuarioRepository,
  ) {}

  async pedido(context: TenantContext, id: string): Promise<DetalheDoPedido> {
    const [pedido, titulos] = await Promise.all([
      this.pedidos.buscar(context.tenantId, id),
      this.titulos.listByPedido(context.tenantId, id),
    ]);
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    return detalheDoPedido(pedido, titulos, hojeNaOperacao());
  }

  async nota(context: TenantContext, pedidoId: string): Promise<DetalheDaNota> {
    const [pedido, titulos] = await Promise.all([
      this.pedidos.buscar(context.tenantId, pedidoId),
      this.titulos.listByPedido(context.tenantId, pedidoId),
    ]);
    if (!pedido) throw new NotFoundException('Pedido de origem da nota não encontrado');
    const nota = detalheDaNota(pedido, titulos, hojeNaOperacao());
    if (!nota) throw new NotFoundException(`O pedido ${pedido.numero} ainda não tem nota fiscal`);
    return nota;
  }

  async titulo(context: TenantContext, id: string): Promise<DetalheDoTitulo> {
    const { tenantId } = context;
    const titulo = await this.titulos.findById(tenantId, id);
    if (!titulo || titulo.tipo !== 'RECEBER') throw new NotFoundException('Título não encontrado');

    const [pedido, cobranca, nomes] = await Promise.all([
      titulo.orderId ? this.pedidos.buscar(tenantId, titulo.orderId) : Promise.resolve(null),
      this.boletos.porTitulo(tenantId, titulo.id),
      this.usuarios.nomes(
        tenantId,
        titulo.liquidacoes.map((liquidacao) => liquidacao.registradoPor),
      ),
    ]);
    // Conta bancaria apagada nao derruba o titulo: o boleto aparece sem o banco.
    const conta: BankAccountConfig | null = cobranca
      ? await this.boletos.account(tenantId, cobranca.boleto.accountId).catch(() => null)
      : null;

    return detalheDoTitulo({
      titulo,
      pedido,
      boleto: cobranca?.boleto ?? null,
      conta,
      eventosDoBoleto: cobranca?.eventos ?? [],
      nomes,
      hoje: hojeNaOperacao(),
    });
  }
}
