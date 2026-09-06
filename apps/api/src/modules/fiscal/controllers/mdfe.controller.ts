import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  driverSchema,
  issueMdfeSchema,
  mdfeEventSchema,
  vehicleSchema,
  type DriverInput,
  type IssueMdfeInput,
  type MdfeEventInput,
  type VehicleInput,
} from '../dto/mdfe.schemas';
import { MdfeService } from '../services/mdfe.service';

@Controller('fiscal/mdfe')
export class MdfeController {
  constructor(private readonly service: MdfeService) {}
  @Post('drivers') @RequirePermission('fiscal.emitir') driver(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(driverSchema)) input: DriverInput,
  ) {
    return this.service.registerDriver(tenant, input);
  }
  @Post('vehicles') @RequirePermission('fiscal.emitir') vehicle(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(vehicleSchema)) input: VehicleInput,
  ) {
    return this.service.registerVehicle(tenant, input);
  }
  @Post() @RequirePermission('fiscal.emitir') issue(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(issueMdfeSchema)) input: IssueMdfeInput,
  ) {
    return this.service.issue(tenant, input);
  }
  @Get('alerts') @RequirePermission('fiscal.visualizar') alerts(
    @CurrentTenant() tenant: TenantContext,
    @Query('hours') hours?: string,
  ) {
    return this.service.alerts(tenant, hours ? Number(hours) : 24);
  }
  @Get(':id') @RequirePermission('fiscal.visualizar') get(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.service.consult(tenant, id);
  }
  @Post(':id/close') @RequirePermission('fiscal.emitir') close(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mdfeEventSchema)) input: MdfeEventInput,
  ) {
    return this.service.close(tenant, id, input);
  }
  @Post(':id/cancel') @RequirePermission('fiscal.cancelar') cancel(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mdfeEventSchema)) input: MdfeEventInput,
  ) {
    return this.service.cancel(tenant, id, input);
  }
  @Get(':id/damdfe') @RequirePermission('fiscal.visualizar') async damdfe(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    response.type('application/pdf').send(Buffer.from(await this.service.damdfe(tenant, id)));
  }
}
