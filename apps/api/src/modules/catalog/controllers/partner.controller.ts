import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { supplierSchema, type SupplierInput } from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { PartnerService } from '../services/partner.service';
import { paginationDtoSchema, type PaginationDto } from '../../../common/dto/pagination.dto';

/** Fornecedores e o historico de atendimento. Cliente tem controller proprio
 *  (`catalog/customers`), com o cadastro completo. */
@Controller('catalog/partners')
export class PartnerController {
  constructor(private readonly service: PartnerService) {}
  @Post('suppliers')
  @RequirePermission('fornecedor.gerenciar')
  @AuditedMutation({ domain: 'SUPPLIER', entity: 'Supplier', collection: 'suppliers' })
  supplier(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(supplierSchema)) input: SupplierInput,
  ) {
    return this.service.createSupplier(tenant, input);
  }
  @Get('suppliers')
  @RequirePermission('fornecedor.gerenciar')
  suppliers(
    @CurrentTenant() tenant: TenantContext,
    @Query('q') query = '',
    @Query(new ZodValidationPipe(paginationDtoSchema)) page: PaginationDto,
  ) {
    return this.service.searchSuppliers(tenant.tenantId, query, page.limit);
  }
  @Get('customers/:id/history')
  @RequirePermission('cliente.gerenciar')
  history(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(paginationDtoSchema)) page: PaginationDto,
  ) {
    return this.service.history(id, page.limit, page.cursor);
  }
}
