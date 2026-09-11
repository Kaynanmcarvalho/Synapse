import { Body, Controller, Get, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { activateProductionSchema, type ActivateProductionInput } from '../dto/platform.schemas';
import { PlatformOnboardingService } from '../services/onboarding.service';

/** §65 "assistente de ativação com as dez etapas". Rota própria em
 *  `platform/onboarding` — não colide com `onboarding/company` do IAM
 *  (criação do tenant), que é uma etapa anterior a esta tela inteira. */
@Controller('platform/onboarding')
@RequirePermission('plataforma.integracoes.visualizar')
export class PlatformOnboardingController {
  constructor(private readonly service: PlatformOnboardingService) {}

  @Get()
  getStatus(@CurrentTenant() context: TenantContext) {
    return this.service.getStatus(context);
  }

  @Post('activate-production')
  @RequirePermission('plataforma.producao.ativar')
  activateProduction(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(activateProductionSchema)) input: ActivateProductionInput,
  ) {
    return this.service.activateProduction(context, input.confirmation);
  }
}
