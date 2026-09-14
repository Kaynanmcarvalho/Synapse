import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentTenant, SkipPermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { ConsultaService } from './consulta.service';

/** CNPJ, CEP e municípios para as fichas. Exige login (o tenant resolvido pela
 *  sessão), mas nenhuma permissão de cadastro: é dado público, e a lupa do CEP
 *  aparece em várias telas. */
@Controller('cadastros/consultas')
@SkipPermission()
export class ConsultaController {
  constructor(private readonly service: ConsultaService) {}

  @Get('cnpj/:cnpj')
  cnpj(@CurrentTenant() _context: TenantContext, @Param('cnpj') cnpj: string) {
    return this.service.cnpj(cnpj);
  }

  @Get('cep/:cep')
  cep(@CurrentTenant() _context: TenantContext, @Param('cep') cep: string) {
    return this.service.cep(cep);
  }

  @Get('municipios')
  municipios(
    @CurrentTenant() _context: TenantContext,
    @Query('uf') uf: string,
    @Query('q') termo?: string,
  ) {
    return this.service.municipios(uf ?? '', termo ?? '');
  }

  @Get('municipios/:codigo')
  municipio(@CurrentTenant() _context: TenantContext, @Param('codigo') codigo: string) {
    return this.service.municipio(codigo);
  }
}
