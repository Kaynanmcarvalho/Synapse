import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryRepository } from './repositories/inventory.repository';
import { InventoryService } from './services/inventory.service';

@Module({ controllers: [InventoryController], providers: [InventoryRepository, InventoryService] })
export class InventoryModule {}
