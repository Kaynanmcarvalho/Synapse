import { Body, Controller, Post } from '@nestjs/common';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { companyOnboardingSchema, type CompanyOnboardingInput } from '../dto/iam.schemas';
import { CurrentUser, SkipDeviceSession, SkipTenant } from '../iam.decorators';
import { OnboardingService } from '../services/onboarding.service';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('company')
  @SkipTenant()
  @SkipDeviceSession()
  createCompany(
    @CurrentUser() user: DecodedIdToken,
    @Body(new ZodValidationPipe(companyOnboardingSchema)) input: CompanyOnboardingInput,
  ) {
    return this.onboarding.createCompany(user.uid, input);
  }
}
