import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  createProductSchema,
  productSearchSchema,
  productStatusSchema,
  updateProductSchema,
  type CreateProductInput,
  type ProductSearchInput,
  type UpdateProductInput,
} from '@synapse/validation';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import {
  buildPhotoStorage,
  buildPhotoUrl,
  isAllowedPhotoExtension,
} from '../services/photo-storage.service';
import { ProductService } from '../services/product.service';

const statusBodySchema = z.object({ status: productStatusSchema });

@Controller('catalog/products')
export class ProductController {
  constructor(private readonly products: ProductService) {}

  @Get()
  @RequirePermission('produto.visualizar')
  search(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(productSearchSchema)) query: ProductSearchInput,
  ) {
    return this.products.search(
      tenant,
      { q: query.q, status: query.status, categoryId: query.categoryId },
      query.limit,
      query.cursor,
    );
  }

  @Post()
  @RequirePermission('produto.criar')
  @AuditedMutation({ domain: 'PRODUCT', entity: 'Product', collection: 'products' })
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(createProductSchema)) input: CreateProductInput,
  ) {
    return this.products.create(tenant, input);
  }

  @Patch(':id')
  @RequirePermission('produto.editar')
  @AuditedMutation({ domain: 'PRODUCT', entity: 'Product', collection: 'products' })
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) input: UpdateProductInput,
  ) {
    return this.products.update(tenant, id, input);
  }

  @Patch(':id/status')
  @RequirePermission('produto.editar')
  @AuditedMutation({ domain: 'PRODUCT', entity: 'Product', collection: 'products' })
  setStatus(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statusBodySchema))
    body: { status: 'active' | 'inactive' | 'blocked' | 'discontinued' },
  ) {
    return this.products.setStatus(tenant, id, body.status);
  }

  @Post(':id/photo')
  @RequirePermission('produto.editar')
  @AuditedMutation({ domain: 'PRODUCT', entity: 'Product', collection: 'products' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildPhotoStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo de foto ausente');
    if (!isAllowedPhotoExtension(file.originalname)) {
      throw new BadRequestException('Formato de imagem nao suportado (use png, jpg, jpeg ou webp)');
    }
    return this.products.setPhoto(tenant, id, buildPhotoUrl(tenant.tenantId, id, file.filename));
  }

  @Post('import')
  @RequirePermission('produto.importar')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  importCsv(@CurrentTenant() tenant: TenantContext, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo CSV ausente');
    return this.products.importCsv(tenant, file.buffer.toString('utf-8'));
  }
}
