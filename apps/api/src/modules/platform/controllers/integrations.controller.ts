import { Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  integrationServiceIdSchema,
  type IntegrationServiceIdParam,
} from '../dto/platform.schemas';
import { IntegrationsService } from '../services/integrations.service';

/** §64 "Central de Integrações": um card por serviço fiscal/bancário. */
@Controller('platform/integrations')
@RequirePermission('plataforma.integracoes.visualizar')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  list(@CurrentTenant() context: TenantContext) {
    return this.service.list(context.tenantId);
  }

  @Post(':service/test')
  @RequirePermission('plataforma.integracoes.testar')
  testConnection(
    @CurrentTenant() context: TenantContext,
    @Param('service', new ZodValidationPipe(integrationServiceIdSchema))
    service: IntegrationServiceIdParam,
  ) {
    return this.service.testConnection(context.tenantId, service);
  }

  @Post(':service/homologation-test')
  @RequirePermission('plataforma.integracoes.testar')
  runHomologationTest(
    @CurrentTenant() context: TenantContext,
    @Param('service', new ZodValidationPipe(integrationServiceIdSchema))
    service: IntegrationServiceIdParam,
  ) {
    return this.service.runHomologationTest(context.tenantId, service);
  }
}
