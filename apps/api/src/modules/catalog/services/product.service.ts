import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  asProductId,
  PRODUCT_STATUS_ALLOWS_SALE,
  type AuditActor,
  type Page,
  type Product,
  type ProductStatus,
} from '@synapse/types';
import {
  productCsvRowSchema,
  type CreateProductInput,
  type ProductCsvRow,
  type UpdateProductInput,
} from '@synapse/validation';
import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import { csvToRecords } from './csv';
import { ProductRepository, type ProductSearchFilter } from '../repositories/product.repository';

export interface ProductImportRowResult {
  readonly line: number;
  readonly ok: boolean;
  readonly sku?: string;
  readonly error?: string;
}

export interface ProductImportResult {
  readonly imported: number;
  readonly failed: number;
  readonly rows: readonly ProductImportRowResult[];
}

/** Margem sobre o preco de venda: (venda - custo) / venda. Zero quando o
 *  preco de venda e zero, para nao dividir por zero num produto recem-criado. */
export const computeMarginPercent = (cost: number, salePrice: number): number =>
  salePrice === 0 ? 0 : Number((((salePrice - cost) / salePrice) * 100).toFixed(2));

const csvRowToProductInput = (row: ProductCsvRow): CreateProductInput => ({
  sku: row.sku,
  internalCode: null,
  ean: row.ean ?? null,
  name: row.name,
  shortDescription: null,
  brand: null,
  manufacturer: null,
  supplierId: null,
  categoryId: row.categoryId ?? null,
  subcategoryId: null,
  status: 'active',
  logistics: {
    unit: row.unit,
    weightKg: null,
    packaging: null,
    quantityPerPackage: 1,
    minStock: 0,
    maxStock: 0,
    tracksLot: false,
    tracksExpiration: false,
  },
  pricing: {
    cost: row.cost,
    averageCost: row.cost,
    lastCost: row.cost,
    salePrice: row.salePrice,
    promotionalPrice: null,
    marginPercent: computeMarginPercent(row.cost, row.salePrice),
  },
  fiscal: {
    ncm: row.ncm,
    cest: null,
    defaultCfop: row.defaultCfop,
    cst: null,
    csosn: null,
    origin: row.origin,
    pisCode: null,
    cofinsCode: null,
    ipiCode: null,
    icmsCode: null,
  },
});

@Injectable()
export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async create(tenant: TenantContext, input: CreateProductInput): Promise<Product> {
    if (await this.repository.findBySku(tenant.tenantId, input.sku)) {
      throw new ConflictException(`Ja existe um produto com o SKU ${input.sku}`);
    }
    const now = new Date().toISOString();
    const actor = this.actor(tenant);
    const product: Product = {
      ...input,
      id: asProductId(randomUUID()),
      tenantId: tenant.tenantId as Product['tenantId'],
      categoryId: input.categoryId as Product['categoryId'],
      subcategoryId: input.subcategoryId as Product['subcategoryId'],
      photoUrl: null,
      createdAt: now,
      createdBy: actor,
      updatedAt: now,
      updatedBy: actor,
      version: 1,
    };
    return this.repository.save(product);
  }

  async update(
    tenant: TenantContext,
    productId: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const product = await this.find(tenant.tenantId, productId);
    if (input.sku && input.sku !== product.sku) {
      const other = await this.repository.findBySku(tenant.tenantId, input.sku);
      if (other && other.id !== product.id)
        throw new ConflictException(`Ja existe um produto com o SKU ${input.sku}`);
    }
    const updated: Product = {
      ...product,
      ...input,
      logistics: { ...product.logistics, ...input.logistics },
      pricing: { ...product.pricing, ...input.pricing },
      fiscal: { ...product.fiscal, ...input.fiscal },
      categoryId: (input.categoryId as Product['categoryId'] | undefined) ?? product.categoryId,
      subcategoryId:
        (input.subcategoryId as Product['subcategoryId'] | undefined) ?? product.subcategoryId,
      updatedAt: new Date().toISOString(),
      updatedBy: this.actor(tenant),
      version: product.version + 1,
    };
    return this.repository.save(updated);
  }

  async setStatus(
    tenant: TenantContext,
    productId: string,
    status: ProductStatus,
  ): Promise<Product> {
    const product = await this.find(tenant.tenantId, productId);
    return this.repository.save({
      ...product,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: this.actor(tenant),
      version: product.version + 1,
    });
  }

  async setPhoto(tenant: TenantContext, productId: string, photoUrl: string): Promise<Product> {
    const product = await this.find(tenant.tenantId, productId);
    return this.repository.save({
      ...product,
      photoUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: this.actor(tenant),
      version: product.version + 1,
    });
  }

  /** Um produto so entra numa venda nova se o status permitir (§5) — bloqueado
   *  e fora de linha nunca entram, mesmo que ainda apareçam em relatorios. */
  async assertCanSell(tenant: TenantContext, productId: string): Promise<Product> {
    const product = await this.find(tenant.tenantId, productId);
    if (!PRODUCT_STATUS_ALLOWS_SALE[product.status]) {
      throw new BadRequestException(
        `Produto ${product.sku} esta com status "${product.status}" e nao pode ser vendido`,
      );
    }
    return product;
  }

  search(
    tenant: TenantContext,
    filter: ProductSearchFilter,
    limit: number,
    cursor?: string,
  ): Promise<Page<Product>> {
    return this.repository.search(tenant.tenantId, filter, limit, cursor);
  }

  async findById(tenant: TenantContext, productId: string): Promise<Product> {
    return this.find(tenant.tenantId, productId);
  }

  /** Produto pelo codigo de barras, SKU ou codigo interno — o que o leitor ou o
   *  balcao digita no campo "Produto / Servico". */
  async findByCode(tenant: TenantContext, code: string): Promise<Product | undefined> {
    const limpo = code.trim();
    if (!limpo) return undefined;
    return (
      (/^\d{8,14}$/.test(limpo)
        ? await this.repository.findByEan(tenant.tenantId, limpo)
        : undefined) ??
      (await this.repository.findBySku(tenant.tenantId, limpo)) ??
      (await this.repository.findBySku(tenant.tenantId, limpo.toUpperCase())) ??
      (await this.repository.findById(tenant.tenantId, limpo))
    );
  }

  listAll(tenant: TenantContext): Promise<Product[]> {
    return this.repository.listAll(tenant.tenantId);
  }

  /** Cada linha e validada e criada de forma independente — uma linha ruim
   *  nao derruba o restante da planilha (c8-5). */
  async importCsv(tenant: TenantContext, csvText: string): Promise<ProductImportResult> {
    const records = csvToRecords(csvText);
    const rows: ProductImportRowResult[] = [];

    for (const [index, record] of records.entries()) {
      const line = index + 2; // +1 cabecalho, +1 para contar a partir de 1
      const parsed = productCsvRowSchema.safeParse(record);
      if (!parsed.success) {
        rows.push({
          line,
          ok: false,
          error: parsed.error.issues.map((issue) => issue.message).join('; '),
        });
        continue;
      }
      try {
        const product = await this.create(tenant, csvRowToProductInput(parsed.data));
        rows.push({ line, ok: true, sku: product.sku });
      } catch (error) {
        rows.push({ line, ok: false, error: (error as Error).message });
      }
    }

    return {
      imported: rows.filter((row) => row.ok).length,
      failed: rows.filter((row) => !row.ok).length,
      rows,
    };
  }

  private async find(tenantId: string, productId: string): Promise<Product> {
    const product = await this.repository.findById(tenantId, productId);
    if (!product) throw new NotFoundException('Produto nao encontrado');
    return product;
  }

  private actor(tenant: TenantContext): AuditActor {
    return { uid: tenant.userId as AuditActor['uid'], email: '', name: '', source: 'api' };
  }
}
