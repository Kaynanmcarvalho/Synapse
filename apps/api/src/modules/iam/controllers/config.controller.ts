import { Body, Controller, Delete, Get, NotFoundException, Param, Put } from '@nestjs/common';
import { configKeySchema } from '@synapse/validation';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../iam.decorators';
import type { TenantContext } from '../iam.types';
import { ConfigResolutionService } from '../services/config-resolution.service';

const setValueSchema = z.object({ value: z.unknown() });

@Controller('iam')
export class ConfigController {
  constructor(private readonly config: ConfigResolutionService) {}

  @Get('config/:key')
  @RequirePermission('filial.configurar')
  getGlobal(
    @CurrentTenant() tenant: TenantContext,
    @Param('key', new ZodValidationPipe(configKeySchema)) key: string,
  ) {
    const resolved = this.config.resolve(tenant, null, key);
    if (!resolved) throw new NotFoundException('Configuracao nao definida');
    return resolved;
  }

  @Put('config/:key')
  @RequirePermission('filial.configurar')
  @AuditedMutation({ domain: 'CONFIG', entity: 'Config', collection: 'settings' })
  setGlobal(
    @CurrentTenant() tenant: TenantContext,
    @Param('key', new ZodValidationPipe(configKeySchema)) key: string,
    @Body(new ZodValidationPipe(setValueSchema)) body: { value: unknown },
  ) {
    return this.config.setGlobal(tenant, key, body.value);
  }

  @Get('branches/:branchId/config/:key')
  @RequirePermission('filial.configurar', 'branchId')
  getForBranch(
    @CurrentTenant() tenant: TenantContext,
    @Param('branchId') branchId: string,
    @Param('key', new ZodValidationPipe(configKeySchema)) key: string,
  ) {
    const resolved = this.config.resolve(tenant, branchId, key);
    if (!resolved) throw new NotFoundException('Configuracao nao definida');
    return resolved;
  }

  @Put('branches/:branchId/config/:key')
  @RequirePermission('filial.configurar', 'branchId')
  @AuditedMutation({ domain: 'CONFIG', entity: 'Config', collection: 'settings' })
  setForBranch(
    @CurrentTenant() tenant: TenantContext,
    @Param('branchId') branchId: string,
    @Param('key', new ZodValidationPipe(configKeySchema)) key: string,
    @Body(new ZodValidationPipe(setValueSchema)) body: { value: unknown },
  ) {
    return this.config.setOverride(tenant, branchId, key, body.value);
  }

  @Delete('branches/:branchId/config/:key')
  @RequirePermission('filial.configurar', 'branchId')
  @AuditedMutation({ domain: 'CONFIG', entity: 'Config', collection: 'settings' })
  resetToInherited(
    @CurrentTenant() tenant: TenantContext,
    @Param('branchId') branchId: string,
    @Param('key', new ZodValidationPipe(configKeySchema)) key: string,
  ) {
    this.config.resetToInherited(tenant, branchId, key);
    return { reset: true };
  }
}
