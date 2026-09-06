import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/app.config';
import { HealthModule } from './modules/health/health.module';
import { IamModule } from './modules/iam/iam.module';

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
  ],
})
export class AppModule {}
