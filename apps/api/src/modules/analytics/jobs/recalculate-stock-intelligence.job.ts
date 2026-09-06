import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StockIntelligenceService } from '../services/stock-intelligence.service';

/** §39: "job periódico recalculando os indicadores". Roda de madrugada, uma
 *  vez por dia — giro, cobertura e sugestão não precisam de frequência
 *  maior, e assim não competem com o horário de pico de venda. */
@Injectable()
export class RecalculateStockIntelligenceJob {
  private readonly logger = new Logger(RecalculateStockIntelligenceJob.name);

  constructor(private readonly service: StockIntelligenceService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    this.logger.log('Iniciando recálculo periódico da inteligência de estoque');
    await this.service.recalculateAllTenants();
    this.logger.log('Recálculo periódico concluído');
  }
}
