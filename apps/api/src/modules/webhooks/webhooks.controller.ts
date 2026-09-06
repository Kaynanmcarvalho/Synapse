import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAppCheck, SkipDeviceSession, SkipPermission, SkipTenant } from '../iam/iam.decorators';
import type { WebhookProvider } from './webhook-signature';
import { WebhooksService } from './webhooks.service';

/** Rotas do §47. Publicas de proposito — quem autentica aqui e a assinatura do
 *  provedor, e nao a sessao de um usuario, porque nao existe usuario do outro
 *  lado. Por isso o cuidado extra: e a porta mais exposta do sistema. */
@Controller('webhooks')
@Public()
@SkipAppCheck()
@SkipTenant()
@SkipDeviceSession()
@SkipPermission()
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  private corpoCru(request: RawBodyRequest<Request>): string {
    // Sem rawBody nao da para conferir assinatura nenhuma: re-serializar o JSON
    // parseado nao reproduz os bytes assinados.
    return request.rawBody?.toString('utf8') ?? '';
  }

  private cabecalhos(request: Request): Record<string, string> {
    return Object.fromEntries(
      Object.entries(request.headers).map(([chave, valor]) => [
        chave.toLowerCase(),
        Array.isArray(valor) ? valor.join(',') : (valor ?? ''),
      ]),
    );
  }

  private receber(provedor: WebhookProvider, request: RawBodyRequest<Request>) {
    return this.webhooks.receber(provedor, this.corpoCru(request), this.cabecalhos(request));
  }

  @Post('sicredi')
  @HttpCode(200)
  sicredi(@Req() request: RawBodyRequest<Request>) {
    return this.receber('sicredi', request);
  }

  @Post('itau')
  @HttpCode(200)
  itau(@Req() request: RawBodyRequest<Request>) {
    return this.receber('itau', request);
  }

  @Post('fiscal')
  @HttpCode(200)
  fiscal(@Req() request: RawBodyRequest<Request>) {
    return this.receber('fiscal', request);
  }
}
