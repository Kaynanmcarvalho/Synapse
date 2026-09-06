import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { PosController } from './controllers/pos.controller';
import { CashSessionRepository } from './repositories/cash-session.repository';
import { PosService } from './services/pos.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';

@Module({
  imports: [CatalogModule],
  controllers: [PosController, OrderController],
  providers: [CashSessionRepository, PosService, OrderRepository, OrderService],
  exports: [OrderService, OrderRepository, CashSessionRepository],
})
export class SalesModule {}
