import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from '../../common/guards/public.guard';
import { AdminUsersController } from './controllers/admin-users.controller';
import { BranchesController } from './controllers/branches.controller';
import { ConfigController } from './controllers/config.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { RolesController } from './controllers/roles.controller';
import { SessionsController } from './controllers/sessions.controller';
import { FirebaseModule } from './firebase.module';
import { AdminGuard } from './guards/admin.guard';
import { AppCheckGuard } from './guards/app-check.guard';
import { DeviceSessionGuard } from './guards/device-session.guard';
import { UntrustedClaimsGuard } from './guards/untrusted-claims.guard';
import { PermissionInterceptor } from './interceptors/permission.interceptor';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor';
import { BranchRepository } from './repositories/branch.repository';
import { ConfigRepository } from './repositories/config.repository';
import { MembershipRepository } from './repositories/membership.repository';
import { RoleRepository } from './repositories/role.repository';
import { SessionRepository } from './repositories/session.repository';
import { AdminUsersService } from './services/admin-users.service';
import { BranchService } from './services/branch.service';
import { ConfigResolutionService } from './services/config-resolution.service';
import { OnboardingService } from './services/onboarding.service';
import { RoleService } from './services/role.service';

@Module({
  imports: [FirebaseModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [
    SessionsController,
    AdminUsersController,
    OnboardingController,
    RolesController,
    BranchesController,
    ConfigController,
  ],
  providers: [
    MembershipRepository,
    SessionRepository,
    RoleRepository,
    BranchRepository,
    ConfigRepository,
    AdminUsersService,
    OnboardingService,
    RoleService,
    BranchService,
    ConfigResolutionService,
    AdminGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AppCheckGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: UntrustedClaimsGuard },
    { provide: APP_GUARD, useClass: DeviceSessionGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: PermissionInterceptor },
  ],
  exports: [MembershipRepository, SessionRepository, RoleService, BranchService],
})
export class IamModule {}
