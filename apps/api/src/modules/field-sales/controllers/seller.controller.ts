import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  createSellerSchema,
  updateSellerSchema,
  type CreateSellerInput,
  type UpdateSellerInput,
} from '../dto/field-sales.schemas';
import { SellerDashboardService } from '../services/seller-dashboard.service';
import { SellerService } from '../services/seller.service';

/** Rotas de autoatendimento: sempre sobre o próprio `context.userId`, nunca
 *  um `:sellerId` na URL — um vendedor não tem como pedir o painel de outro
 *  trocando um id na requisição, porque o id nem existe na requisição. */
@Controller('field-sales/me')
@RequirePermission('venda.criar')
export class SellerSelfController {
  constructor(
    private readonly sellers: SellerService,
    private readonly dashboard: SellerDashboardService,
  ) {}

  @Get('profile')
  profile(@CurrentTenant() context: TenantContext) {
    return this.sellers.getOwnProfile(context);
  }

  @Get('dashboard')
  getDashboard(@CurrentTenant() context: TenantContext) {
    return this.dashboard.getDashboard(context);
  }

  @Get('customers')
  customers(@CurrentTenant() context: TenantContext) {
    return this.dashboard.getMyCustomers(context);
  }

  @Get('orders')
  orders(@CurrentTenant() context: TenantContext, @Query('pending') pending?: string) {
    return this.dashboard.getMyOrders(context, pending === 'true');
  }
}

/** Cadastro dos vendedores — quem monta a filial, região, comissão e meta é
 *  a administração, não o próprio vendedor (§27 "cada vendedor tem..."). */
@Controller('field-sales/sellers')
@RequirePermission('vendedor.gerenciar')
export class SellerAdminController {
  constructor(private readonly sellers: SellerService) {}

  @Get()
  list(@CurrentTenant() context: TenantContext) {
    return this.sellers.list(context);
  }

  @Post()
  create(
    @CurrentTenant() context: TenantContext,
    @Body(new ZodValidationPipe(createSellerSchema)) input: CreateSellerInput,
  ) {
    return this.sellers.create(context, input);
  }

  @Patch(':id')
  update(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSellerSchema)) input: UpdateSellerInput,
  ) {
    return this.sellers.update(context, id, input);
  }
}
