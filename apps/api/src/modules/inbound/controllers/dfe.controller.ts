import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  checkDfeItemSchema,
  importDfeXmlSchema,
  launchDfeSchema,
  manifestDfeSchema,
  pollDfeSchema,
  supplierMappingSchema,
  type CheckDfeItemInput,
  type ImportDfeXmlInput,
  type LaunchDfeInput,
  type ManifestDfeInput,
  type PollDfeInput,
  type SupplierMappingInput,
} from '../dto/dfe.schemas';
import { DfeService } from '../services/dfe.service';
import { RequireFeature } from '../../saas/feature.decorator';

@Controller('inbound/dfe')
@RequireFeature('DFE')
@AuditedMutation({ domain: 'FISCAL', entity: 'InboundDfe', collection: 'inboundDfe' })
export class DfeController {
  constructor(private readonly service: DfeService) {}

  @Post('poll')
  @RequirePermission('fiscal.visualizar')
  poll(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(pollDfeSchema)) input: PollDfeInput,
  ) {
    return this.service.poll(tenant, input);
  }

  @Post('import')
  @RequirePermission('fiscal.emitir')
  importXml(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(importDfeXmlSchema)) input: ImportDfeXmlInput,
  ) {
    return this.service.importXml(tenant, input);
  }

  @Get()
  @RequirePermission('fiscal.visualizar')
  list(@CurrentTenant() tenant: TenantContext) {
    return this.service.list(tenant);
  }

  @Post('mappings')
  @RequirePermission('estoque.ajustar')
  mapping(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(supplierMappingSchema)) input: SupplierMappingInput,
  ) {
    return this.service.saveMapping(tenant, input);
  }

  @Get(':accessKey')
  @RequirePermission('fiscal.visualizar')
  get(@CurrentTenant() tenant: TenantContext, @Param('accessKey') accessKey: string) {
    return this.service.get(tenant, accessKey);
  }

  @Post(':accessKey/manifest')
  @RequirePermission('fiscal.emitir')
  manifest(
    @CurrentTenant() tenant: TenantContext,
    @Param('accessKey') accessKey: string,
    @Body(new ZodValidationPipe(manifestDfeSchema)) input: ManifestDfeInput,
  ) {
    return this.service.manifest(tenant, accessKey, input);
  }

  @Patch(':accessKey/items/:number')
  @RequirePermission('estoque.ajustar')
  checkItem(
    @CurrentTenant() tenant: TenantContext,
    @Param('accessKey') accessKey: string,
    @Param('number', ParseIntPipe) number: number,
    @Body(new ZodValidationPipe(checkDfeItemSchema)) input: CheckDfeItemInput,
  ) {
    return this.service.checkItem(tenant, accessKey, number, input);
  }

  @Post(':accessKey/conclude')
  @RequirePermission('estoque.ajustar')
  conclude(@CurrentTenant() tenant: TenantContext, @Param('accessKey') accessKey: string) {
    return this.service.conclude(tenant, accessKey);
  }

  @Post(':accessKey/launch')
  @RequirePermission('estoque.ajustar')
  launch(
    @CurrentTenant() tenant: TenantContext,
    @Param('accessKey') accessKey: string,
    @Body(new ZodValidationPipe(launchDfeSchema)) input: LaunchDfeInput,
  ) {
    return this.service.launch(tenant, accessKey, input);
  }
}
