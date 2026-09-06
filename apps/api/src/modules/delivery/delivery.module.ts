import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryRepository } from './delivery.repository';
import { DeliveryService } from './delivery.service';
@Module({
  imports: [InventoryModule],
  controllers: [DeliveryController],
  providers: [DeliveryRepository, DeliveryService],
})
export class DeliveryModule {}
