import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from '../../common/guards/public.guard';
import { AdminUsersController } from './controllers/admin-users.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { SessionsController } from './controllers/sessions.controller';
import { FirebaseModule } from './firebase.module';
import { AdminGuard } from './guards/admin.guard';
import { AppCheckGuard } from './guards/app-check.guard';
import { DeviceSessionGuard } from './guards/device-session.guard';
import { UntrustedTenantInputGuard } from './guards/untrusted-tenant-input.guard';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';
import { MembershipRepository } from './repositories/membership.repository';
import { SessionRepository } from './repositories/session.repository';
import { AdminUsersService } from './services/admin-users.service';
import { OnboardingService } from './services/onboarding.service';

@Module({
  imports: [FirebaseModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [SessionsController, AdminUsersController, OnboardingController],
  providers: [
    MembershipRepository,
    SessionRepository,
    AdminUsersService,
    OnboardingService,
    AdminGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AppCheckGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UntrustedTenantInputGuard },
    { provide: APP_GUARD, useClass: DeviceSessionGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [MembershipRepository, SessionRepository],
})
export class IamModule {}
