import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { DataSubjectController } from './controllers/data-subject.controller';
import { ConsentRepository } from './repositories/consent.repository';
import { DataSubjectService } from './services/data-subject.service';

@Module({
  imports: [CatalogModule],
  controllers: [DataSubjectController],
  providers: [ConsentRepository, DataSubjectService],
})
export class ComplianceModule {}
