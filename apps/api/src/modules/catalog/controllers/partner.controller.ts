import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  customerSchema,
  supplierSchema,
  type CustomerInput,
  type SupplierInput,
} from '@synapse/validation';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { PartnerService } from '../services/partner.service';

const financialStatusSchema = z.object({ status: z.enum(['REGULAR', 'OVERDUE', 'BLOCKED']) });

@Controller('catalog/partners')
export class PartnerController {
  constructor(private readonly service: PartnerService) {}
  @Post('customers')
  @RequirePermission('cliente.gerenciar')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Customer', collection: 'customers' })
  customer(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(customerSchema)) input: CustomerInput,
  ) {
    return this.service.createCustomer(tenant, input);
  }
  @Post('suppliers')
  @RequirePermission('fornecedor.gerenciar')
  @AuditedMutation({ domain: 'SUPPLIER', entity: 'Supplier', collection: 'suppliers' })
  supplier(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(supplierSchema)) input: SupplierInput,
  ) {
    return this.service.createSupplier(tenant, input);
  }
  @Get('customers')
  @RequirePermission('cliente.gerenciar')
  customers(@CurrentTenant() tenant: TenantContext, @Query('q') query = '') {
    return this.service.searchCustomers(tenant.tenantId, query);
  }
  @Get('suppliers')
  @RequirePermission('fornecedor.gerenciar')
  suppliers(@CurrentTenant() tenant: TenantContext, @Query('q') query = '') {
    return this.service.searchSuppliers(tenant.tenantId, query);
  }
  @Get('customers/:id/history')
  @RequirePermission('cliente.gerenciar')
  history(@Param('id') id: string) {
    return this.service.history(id);
  }
  @Patch('customers/:id/financial-status')
  @RequirePermission('cliente.gerenciar')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Customer', collection: 'customers' })
  status(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(financialStatusSchema))
    body: { status: 'REGULAR' | 'OVERDUE' | 'BLOCKED' },
  ) {
    return this.service.setFinancialStatus(tenant.tenantId, id, body.status);
  }
}
