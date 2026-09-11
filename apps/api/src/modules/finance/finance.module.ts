import { Module } from '@nestjs/common';
import { BoletoRepository } from './repositories/boleto.repository';
import { BoletoService } from './services/boleto.service';
import { BoletoController, BankAccountController } from './controllers/boleto.controller';
import { TituloRepository } from './repositories/titulo.repository';
import { MockBankProvider } from './providers/mock-bank.provider';
import { BankProviderRegistry } from './services/bank-provider.registry';
import { TituloService } from './services/titulo.service';

@Module({
  controllers: [BoletoController, BankAccountController],
  // MockBankProvider e BankProviderRegistry existiam como classes soltas,
  // sem nenhum module registrando-as no DI — Sicredi/ItauProvider continuam
  // instanciados manualmente dentro do registry (não são providers Nest).
  providers: [
    TituloRepository,
    TituloService,
    MockBankProvider,
    BankProviderRegistry,
    BoletoRepository,
    BoletoService,
  ],
  exports: [TituloService, TituloRepository, BankProviderRegistry, BoletoRepository, BoletoService],
})
export class FinanceModule {}
