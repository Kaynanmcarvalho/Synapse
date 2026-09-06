import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { EmailGateway, FcmGateway } from './notification.gateways';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationRepository, NotificationService, FcmGateway, EmailGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
