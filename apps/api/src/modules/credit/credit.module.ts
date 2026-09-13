import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { IamModule } from '../iam/iam.module';
import { AnaliseDeCreditoController } from './controllers/analise-de-credito.controller';
import { ClienteRepository } from './repositories/cliente.repository';
import { PedidoDeVendaRepository } from './repositories/pedido-de-venda.repository';
import { UsuarioRepository } from './repositories/usuario.repository';
import { AnaliseDeCreditoService } from './services/analise-de-credito.service';
import { DecisaoDeCreditoService } from './services/decisao-de-credito.service';
import { DocumentosDoCreditoService } from './services/documentos-do-credito.service';
import { LeitorDeCredito } from './services/leitor-de-credito';

/** Analise de credito: a fila de pedidos que o vendedor mandou, a ficha do
 *  cliente (situacao de credito, comportamento, pedidos, notas e titulos), as
 *  decisoes com a politica de credito e os documentos que a lupa abre. Le o
 *  financeiro pelo FinanceModule, que ja e dono dos titulos e dos boletos, e as
 *  permissoes do usuario pelo IamModule (aprovar excecao e permissao propria). */
@Module({
  imports: [FinanceModule, IamModule],
  controllers: [AnaliseDeCreditoController],
  providers: [
    PedidoDeVendaRepository,
    ClienteRepository,
    UsuarioRepository,
    LeitorDeCredito,
    AnaliseDeCreditoService,
    DecisaoDeCreditoService,
    DocumentosDoCreditoService,
  ],
  exports: [AnaliseDeCreditoService, PedidoDeVendaRepository],
})
export class CreditModule {}
