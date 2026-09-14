import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { DecodedIdToken } from '@synapse/firebase/admin';
import { funcionarioSchema, type FuncionarioInput } from '@synapse/validation';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AuditedMutation } from '../../audit/audit.decorator';
import { CurrentTenant, CurrentUser, RequirePermission } from '../../iam/iam.decorators';
import type { TenantContext } from '../../iam/iam.types';
import { atorDoToken } from '../ator';
import { funcionarioNaLista } from './funcionario.repository';
import { FuncionarioService, MAIOR_FOTO_EM_BYTES } from './funcionario.service';

const listaSchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().trim().max(200).optional(),
});

const usuarioSchema = z.object({ uid: z.string().trim().min(1).max(128).nullable() });

const AUDITORIA = {
  domain: 'EMPLOYEE',
  entity: 'Funcionario',
  collection: 'funcionarios',
} as const;

/** Cadastro de funcionários (Cadastros › Funcionários › Funcionários). */
@Controller('cadastros/funcionarios')
export class FuncionarioController {
  constructor(private readonly service: FuncionarioService) {}

  @Get()
  @RequirePermission('funcionario.gerenciar')
  lista(
    @CurrentTenant() context: TenantContext,
    @Query(new ZodValidationPipe(listaSchema)) query: z.infer<typeof listaSchema>,
  ) {
    return this.service.listar(context, {
      ...(query.q ? { termo: query.q } : {}),
      limite: query.limit,
      cursor: query.cursor ?? null,
    });
  }

  /** Para o campo Vendedor do Ponto de Vendas e do PDV: quem vende não precisa
   *  poder cadastrar funcionário. */
  @Get('vendedores')
  @RequirePermission('venda.criar')
  async vendedores(@CurrentTenant() context: TenantContext, @Query('q') termo?: string) {
    return (await this.service.vendedoresAtivos(context, termo ?? '')).map((funcionario) => ({
      ...funcionarioNaLista(funcionario),
      descontoMaximoPercentual: funcionario.comissao.descontoMaximoPercentual,
    }));
  }

  /** Logins do tenant para "Manutenção de Usuário". */
  @Get('usuarios')
  @RequirePermission('usuario.gerenciar')
  usuarios(@CurrentTenant() context: TenantContext) {
    return this.service.usuariosDoTenant(context);
  }

  @Get(':id')
  @RequirePermission('funcionario.gerenciar')
  buscar(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.buscar(context, id);
  }

  @Get(':id/pedidos')
  @RequirePermission('funcionario.gerenciar')
  pedidos(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.pedidos(context, id);
  }

  @Get(':id/resumo')
  @RequirePermission('funcionario.gerenciar')
  resumo(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @Query('mes') mes?: string,
  ) {
    return this.service.resumo(context, id, mes);
  }

  @Get(':id/foto')
  @RequirePermission('funcionario.gerenciar')
  async foto(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    const foto = await this.service.lerFoto(context, id);
    return { tipo: foto.tipo, base64: foto.conteudo.toString('base64') };
  }

  @Post()
  @RequirePermission('funcionario.gerenciar')
  @AuditedMutation(AUDITORIA)
  criar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Body(new ZodValidationPipe(funcionarioSchema)) input: FuncionarioInput,
  ) {
    return this.service.criar(context, input, atorDoToken(auth));
  }

  @Put(':id')
  @RequirePermission('funcionario.gerenciar')
  @AuditedMutation(AUDITORIA)
  atualizar(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(funcionarioSchema)) input: FuncionarioInput,
  ) {
    return this.service.atualizar(context, id, input, atorDoToken(auth));
  }

  @Post(':id/foto')
  @RequirePermission('funcionario.gerenciar')
  @AuditedMutation(AUDITORIA)
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: MAIOR_FOTO_EM_BYTES + 1 },
    }),
  )
  gravarFoto(
    @CurrentTenant() context: TenantContext,
    @Param('id') id: string,
    @UploadedFile() arquivo: Express.Multer.File | undefined,
  ) {
    if (!arquivo) throw new BadRequestException('Escolha a foto');
    return this.service.gravarFoto(context, id, arquivo);
  }

  @Delete(':id/foto')
  @RequirePermission('funcionario.gerenciar')
  @AuditedMutation(AUDITORIA)
  removerFoto(@CurrentTenant() context: TenantContext, @Param('id') id: string) {
    return this.service.removerFoto(context, id);
  }

  @Put(':id/usuario')
  @RequirePermission('usuario.gerenciar')
  @AuditedMutation(AUDITORIA)
  definirUsuario(
    @CurrentTenant() context: TenantContext,
    @CurrentUser() auth: DecodedIdToken,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(usuarioSchema)) body: z.infer<typeof usuarioSchema>,
  ) {
    return this.service.definirUsuario(context, id, body.uid, atorDoToken(auth));
  }
}
