import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { ConsultaController } from './consultas/consulta.controller';
import { ConsultaService } from './consultas/consulta.service';
import { FuncionarioRepository } from './funcionarios/funcionario.repository';
import { TabelaController } from './tabelas/tabela.controller';
import { TabelaRepository } from './tabelas/tabela.repository';
import { TabelaService } from './tabelas/tabela.service';

/** O que outros módulos (vendas, PDV) leem dos cadastros sem depender das
 *  fichas inteiras: tabelas auxiliares, consultas públicas e o repositório de
 *  funcionários. Fica separado para vendas importar sem ciclo com compras e
 *  crédito. */
@Module({
  imports: [IamModule],
  controllers: [TabelaController, ConsultaController],
  providers: [TabelaRepository, TabelaService, ConsultaService, FuncionarioRepository],
  exports: [TabelaService, ConsultaService, FuncionarioRepository],
})
export class CadastrosBaseModule {}
