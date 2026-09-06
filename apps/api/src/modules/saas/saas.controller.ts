import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentTenant, SkipPermission } from '../iam/iam.decorators';
import type { TenantContext } from '../iam/iam.types';
import {
  consumeResourceSchema,
  createTenantSubscriptionSchema,
  type ConsumeResourceInput,
  type CreateTenantSubscriptionInput,
  type UpdateTenantSubscriptionInput,
  updateTenantSubscriptionSchema,
} from './dto/saas.schemas';
import { SaasService } from './saas.service';
import {
  updateBrandingSchema,
  updateFeatureSchema,
  type UpdateBrandingInput,
  type UpdateFeatureInput,
} from './dto/feature.schemas';
import { FeatureService } from './feature.service';

@Controller('saas')
@SkipPermission()
export class SaasController {
  constructor(
    private readonly service: SaasService,
    private readonly features: FeatureService,
  ) {}

  @Get('companies') list(@CurrentTenant() context: TenantContext) {
    return this.service.list(context);
  }

  @Post('companies') create(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(createTenantSubscriptionSchema))
    input: CreateTenantSubscriptionInput,
  ) {
    return this.service.create(context, input);
  }

  @Patch('companies/:tenantId') update(
    @CurrentTenant() context: TenantContext,
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(updateTenantSubscriptionSchema))
    input: UpdateTenantSubscriptionInput,
  ) {
    return this.service.update(context, tenantId, input);
  }

  @Post('companies/:tenantId/usage') consume(
    @CurrentTenant() context: TenantContext,
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(consumeResourceSchema)) input: ConsumeResourceInput,
  ) {
    return this.service.consume(context, tenantId, input);
  }

  @Get('metrics') metrics(@CurrentTenant() context: TenantContext) {
    return this.service.metrics(context);
  }

  @Get('experience') experience(@CurrentTenant() context: TenantContext) {
    return this.features.getForCurrentTenant(context);
  }

  @Get('companies/:tenantId/experience') tenantExperience(
    @CurrentTenant() context: TenantContext,
    @Param('tenantId') tenantId: string,
  ) {
    this.service.list(context);
    return this.features.get(tenantId);
  }

  @Patch('companies/:tenantId/features') feature(
    @CurrentTenant() context: TenantContext,
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(updateFeatureSchema)) input: UpdateFeatureInput,
  ) {
    return this.features.setFeature(context, tenantId, input);
  }

  @Patch('companies/:tenantId/branding') branding(
    @CurrentTenant() context: TenantContext,
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(updateBrandingSchema)) input: UpdateBrandingInput,
  ) {
    return this.features.setBranding(context, tenantId, input);
  }
}
