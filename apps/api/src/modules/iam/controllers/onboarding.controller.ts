import { Body, Controller, Post, Req, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { companyOnboardingSchema, type CompanyOnboardingInput } from '../dto/iam.schemas';
import { SkipDeviceSession, SkipTenant } from '../iam.decorators';
import type { AuthenticatedRequest } from '../iam.types';
import { OnboardingService } from '../services/onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('company')
  @SkipTenant()
  @SkipDeviceSession()
  @UsePipes(new ZodValidationPipe(companyOnboardingSchema))
  createCompany(@Req() request: AuthenticatedRequest, @Body() input: CompanyOnboardingInput) {
    return this.onboarding.createCompany(request.auth!.uid, input);
  }
}
