import { Module } from '@nestjs/common';
import { CadastrosBaseModule } from '../cadastros/cadastros-base.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CreditModule } from '../credit/credit.module';
import { IamModule } from '../iam/iam.module';
import { BalcaoController } from './balcao/balcao.controller';
import { PedidoDeBalcaoService } from './balcao/pedido-de-balcao.service';

/** Vendas do Syndata que viram pedido: Venda Balcão (Ponto de Vendas). O PDV
 *  (caixa) continua no módulo de vendas do caixa (`sales/pos`). */
@Module({
  imports: [CadastrosBaseModule, CatalogModule, CreditModule, IamModule],
  controllers: [BalcaoController],
  providers: [PedidoDeBalcaoService],
})
export class VendasModule {}
