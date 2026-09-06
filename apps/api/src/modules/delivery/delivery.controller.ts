import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../iam/iam.decorators';
import type { TenantContext } from '../iam/iam.types';
import { DeliveryService } from './delivery.service';
import { paginationDtoSchema, type PaginationDto } from '../../common/dto/pagination.dto';
import {
  assignmentSchema,
  createRouteSchema,
  failureSchema,
  pickingSchema,
  proofSchema,
  type AssignmentInput,
  type CreateRouteInput,
  type FailureInput,
  type PickingInput,
  type ProofInput,
} from './dto/delivery.schemas';
@Controller('delivery/routes')
@RequirePermission('venda.criar')
export class DeliveryController {
  constructor(private readonly service: DeliveryService) {}
  @Post() create(
    @CurrentTenant() t: TenantContext,
    @Body(new ZodValidationPipe(createRouteSchema)) i: CreateRouteInput,
  ) {
    return this.service.create(t, i);
  }
  @Get() list(
    @CurrentTenant() t: TenantContext,
    @Query(new ZodValidationPipe(paginationDtoSchema)) page: PaginationDto,
  ) {
    return this.service.list(t, page.limit, page.cursor);
  }
  @Post(':id/assign') assign(
    @CurrentTenant() t: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignmentSchema)) i: AssignmentInput,
  ) {
    return this.service.assign(t, id, i);
  }
  @Post(':id/deliveries/:deliveryId/pick') pick(
    @CurrentTenant() t: TenantContext,
    @Param('id') id: string,
    @Param('deliveryId') d: string,
    @Body(new ZodValidationPipe(pickingSchema)) i: PickingInput,
  ) {
    return this.service.pick(t, id, d, i);
  }
  @Post(':id/deliveries/:deliveryId/start-picking') startPicking(
    @CurrentTenant() t: TenantContext,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.service.startPicking(t, id, deliveryId);
  }
  @Post(':id/dispatch') dispatch(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.service.dispatch(t, id);
  }
  @Post(':id/deliveries/:deliveryId/deliver') deliver(
    @CurrentTenant() t: TenantContext,
    @Param('id') id: string,
    @Param('deliveryId') d: string,
    @Body(new ZodValidationPipe(proofSchema)) i: ProofInput,
  ) {
    return this.service.deliver(t, id, d, i);
  }
  @Post(':id/deliveries/:deliveryId/fail') fail(
    @CurrentTenant() t: TenantContext,
    @Param('id') id: string,
    @Param('deliveryId') d: string,
    @Body(new ZodValidationPipe(failureSchema)) i: FailureInput,
  ) {
    return this.service.fail(t, id, d, i);
  }
}
