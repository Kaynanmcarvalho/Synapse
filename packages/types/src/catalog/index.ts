import type { AuditStamp, CategoryId, ProductId, TenantId } from '../common';

/** ativo, inativo, bloqueado, fora de linha (§5). */
export type ProductStatus = 'active' | 'inactive' | 'blocked' | 'discontinued';

export interface Category {
  readonly id: CategoryId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly parentId: CategoryId | null;
}

export interface ProductFiscalData {
  readonly ncm: string;
  readonly cest: string | null;
  readonly defaultCfop: string;
  readonly cst: string | null;
  readonly csosn: string | null;
  readonly origin: number;
  readonly pisCode: string | null;
  readonly cofinsCode: string | null;
  readonly ipiCode: string | null;
  readonly icmsCode: string | null;
}

export interface ProductPricing {
  readonly cost: number;
  readonly averageCost: number;
  readonly lastCost: number;
  readonly salePrice: number;
  readonly promotionalPrice: number | null;
  readonly marginPercent: number;
}

export interface ProductLogistics {
  readonly unit: string;
  readonly weightKg: number | null;
  readonly packaging: string | null;
  readonly quantityPerPackage: number;
  readonly minStock: number;
  readonly maxStock: number;
  readonly tracksLot: boolean;
  readonly tracksExpiration: boolean;
}

export interface Product extends AuditStamp {
  readonly id: ProductId;
  readonly tenantId: TenantId;
  readonly sku: string;
  readonly internalCode: string | null;
  readonly ean: string | null;
  readonly name: string;
  readonly shortDescription: string | null;
  readonly brand: string | null;
  readonly manufacturer: string | null;
  readonly supplierId: string | null;
  readonly categoryId: CategoryId | null;
  readonly subcategoryId: CategoryId | null;
  readonly photoUrl: string | null;
  readonly status: ProductStatus;
  readonly logistics: ProductLogistics;
  readonly pricing: ProductPricing;
  readonly fiscal: ProductFiscalData;
}

/** O que cada status permite. Um produto `blocked` ou `discontinued` nunca
 *  entra em uma venda nova, mesmo que ainda apareça em relatorios historicos. */
export const PRODUCT_STATUS_ALLOWS_SALE: Record<ProductStatus, boolean> = {
  active: true,
  inactive: false,
  blocked: false,
  discontinued: false,
};
