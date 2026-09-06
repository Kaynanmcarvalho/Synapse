import { Body, Controller, Post } from '@nestjs/common';
import {
  createPriceTableEntrySchema,
  resolvePriceSchema,
  type CreatePriceTableEntryInput,
  type ResolvePriceInput,
} from '@synapse/validation';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { PricingService } from '../services/pricing.service';

const branchPriceSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  price: z.number().nonnegative(),
});
const customerPriceSchema = z.object({
  productId: z.string().min(1),
  customerId: z.string().min(1),
  price: z.number().nonnegative(),
});
const sellerLimitSchema = z.object({
  sellerId: z.string().min(1),
  limitPercent: z.number().min(0).max(100),
});

@Controller('catalog/pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post('resolve')
  @RequirePermission('produto.visualizar')
  resolve(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(resolvePriceSchema)) input: ResolvePriceInput,
  ) {
    return this.pricing.resolvePrice(tenant, input);
  }

  @Post('tables')
  @RequirePermission('preco.gerenciar')
  @AuditedMutation({ domain: 'PRICE', entity: 'PriceTableEntry', collection: 'priceTables' })
  createTableEntry(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createPriceTableEntrySchema)) input: CreatePriceTableEntryInput,
  ) {
    return this.pricing.createPriceTableEntry(tenant, input);
  }

  @Post('branch-price')
  @RequirePermission('preco.gerenciar')
  @AuditedMutation({ domain: 'PRICE', entity: 'BranchPrice', collection: 'branchPrices' })
  setBranchPrice(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(branchPriceSchema)) body: z.infer<typeof branchPriceSchema>,
  ) {
    this.pricing.setBranchPrice(tenant, body.productId, body.branchId, body.price);
    return { ok: true };
  }

  @Post('customer-price')
  @RequirePermission('preco.gerenciar')
  @AuditedMutation({ domain: 'PRICE', entity: 'CustomerPrice', collection: 'customerPrices' })
  setCustomerPrice(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(customerPriceSchema)) body: z.infer<typeof customerPriceSchema>,
  ) {
    this.pricing.setCustomerPrice(tenant, body.productId, body.customerId, body.price);
    return { ok: true };
  }

  @Post('seller-discount-limit')
  @RequirePermission('preco.gerenciar')
  @AuditedMutation({
    domain: 'PRICE',
    entity: 'SellerDiscountLimit',
    collection: 'sellerDiscountLimits',
  })
  setSellerDiscountLimit(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(sellerLimitSchema)) body: z.infer<typeof sellerLimitSchema>,
  ) {
    this.pricing.setSellerDiscountLimit(tenant, body.sellerId, body.limitPercent);
    return { ok: true };
  }
}
