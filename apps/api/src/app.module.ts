import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { HealthModule } from './modules/health/health.module';
import { IamModule } from './modules/iam/iam.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { SalesModule } from './modules/sales/sales.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    IamModule,
    SalesModule,
    FiscalModule,
  ],
})
export class AppModule {}
