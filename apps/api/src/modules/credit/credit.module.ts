import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { AnaliseDeCreditoController } from './controllers/analise-de-credito.controller';
import { ClienteRepository } from './repositories/cliente.repository';
import { PedidoDeVendaRepository } from './repositories/pedido-de-venda.repository';
import { AnaliseDeCreditoService } from './services/analise-de-credito.service';

/** Analise de credito: a fila de pedidos que o vendedor mandou e a ficha do
 *  cliente (pedidos, notas, titulos em aberto e pagamentos) que decide a
 *  liberacao. Le o financeiro pelo FinanceModule, que ja e dono dos titulos. */
@Module({
  imports: [FinanceModule],
  controllers: [AnaliseDeCreditoController],
  providers: [PedidoDeVendaRepository, ClienteRepository, AnaliseDeCreditoService],
  exports: [AnaliseDeCreditoService, PedidoDeVendaRepository],
})
export class CreditModule {}
