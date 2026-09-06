import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentTenant, SkipPermission } from '../iam/iam.decorators';
import type { TenantContext } from '../iam/iam.types';
import {
  deviceSchema,
  preferenceSchema,
  publishSchema,
  type DeviceInput,
  type PreferenceInput,
  type PublishInput,
} from './dto/notification.schemas';
import { NotificationService } from './notification.service';
import { paginationDtoSchema, type PaginationDto } from '../../common/dto/pagination.dto';

@Controller('notifications')
@SkipPermission()
export class NotificationController {
  constructor(private readonly service: NotificationService) {}
  @Get() list(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(paginationDtoSchema)) page: PaginationDto,
  ) {
    return this.service.list(context, page.limit, page.cursor);
  }
  @Patch(':id/read') read(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.read(context, id);
  }
  @Post('devices') device(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(deviceSchema)) input: DeviceInput,
  ) {
    return this.service.register(context, input);
  }
  @Put('preferences') preference(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(preferenceSchema)) input: PreferenceInput,
  ) {
    return this.service.preference(context, input);
  }
  @Post('events') publish(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(publishSchema)) input: PublishInput,
  ) {
    return this.service.publish(context, input);
  }
}
