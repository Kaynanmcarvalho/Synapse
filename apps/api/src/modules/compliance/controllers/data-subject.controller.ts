import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { recordConsentSchema, type RecordConsentInput } from '../dto/compliance.schemas';
import { DataSubjectService } from '../services/data-subject.service';

@Controller('compliance/subjects/:subjectId')
@RequirePermission('cliente.gerenciar')
export class DataSubjectController {
  constructor(private readonly subjects: DataSubjectService) {}

  @Post('consent')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Consent', collection: 'consents' })
  recordConsent(
    @CurrentTenant() tenant: TenantContext,
    @Param('subjectId') subjectId: string,
    @Body(new ZodValidationPipe(recordConsentSchema)) input: RecordConsentInput,
    @Req() request: Request,
  ) {
    return this.subjects.recordConsent(
      tenant,
      subjectId,
      input.purpose,
      input.granted,
      request.ip ?? null,
    );
  }

  @Get('consent')
  consentStatus(@CurrentTenant() tenant: TenantContext, @Param('subjectId') subjectId: string) {
    return this.subjects.consentStatus(tenant, subjectId);
  }

  @Get('export')
  export(@CurrentTenant() tenant: TenantContext, @Param('subjectId') subjectId: string) {
    return this.subjects.exportSubjectData(tenant, subjectId);
  }

  @Post('anonymize')
  @AuditedMutation({ domain: 'CUSTOMER', entity: 'Customer', collection: 'customers' })
  anonymize(@CurrentTenant() tenant: TenantContext, @Param('subjectId') subjectId: string) {
    return this.subjects.anonymize(tenant, subjectId);
  }
}
