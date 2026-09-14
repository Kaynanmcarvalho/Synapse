import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { CreditModule } from '../credit/credit.module';
import { FinanceModule } from '../finance/finance.module';
import { IamModule } from '../iam/iam.module';
import { PurchasingModule } from '../purchasing/purchasing.module';
import { CadastrosBaseModule } from './cadastros-base.module';
import { FornecedorController } from './fornecedores/fornecedor.controller';
import { FornecedorService } from './fornecedores/fornecedor.service';
import { FuncionarioController } from './funcionarios/funcionario.controller';
import { FuncionarioService } from './funcionarios/funcionario.service';

/** Cadastros do Syndata com ficha completa: fornecedores e funcionários. */
@Module({
  imports: [
    CadastrosBaseModule,
    CatalogModule,
    CreditModule,
    FinanceModule,
    PurchasingModule,
    IamModule,
  ],
  controllers: [FornecedorController, FuncionarioController],
  providers: [FornecedorService, FuncionarioService],
  exports: [FuncionarioService],
})
export class CadastrosModule {}
