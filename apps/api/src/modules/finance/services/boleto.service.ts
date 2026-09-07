import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Titulo } from '@synapse/types';
import { createHash } from 'node:crypto';
import type { TenantContext } from '../../iam/iam.types';
import type { InstallmentInput } from '../dto/boleto.schemas';
import { installments, type Charge } from '../entities/boleto';
import { BoletoRepository } from '../repositories/boleto.repository';
import { BankProviderRegistry } from './bank-provider.registry';

@Injectable()
export class BoletoService {
  constructor(
    private readonly repository: BoletoRepository,
    private readonly providers: BankProviderRegistry,
  ) {}

  private allowBranch(context: TenantContext, branchId: string) {
    if (context.branchIds.length && !context.branchIds.includes(branchId))
      throw new ForbiddenException('Filial não permitida');
  }
  async issue(context: TenantContext, input: InstallmentInput): Promise<Charge[]> {
    this.allowBranch(context, input.branchId);
    const provider = this.providers.resolve(
      await this.repository.account(context.tenantId, input.accountId),
    );
    const result: Charge[] = [];
    for (const [index, parcel] of installments(input).entries()) {
      const id = createHash('sha256')
        .update(JSON.stringify([context.tenantId, input.idempotencyKey, index]))
        .digest('hex');
      const now = new Date().toISOString();
      const titulo: Titulo = {
        id,
        tenantId: context.tenantId as Titulo['tenantId'],
        branchId: input.branchId as Titulo['branchId'],
        tipo: 'RECEBER',
        descricao: `${input.description} (${index + 1}/${input.installments})`,
        customerId: input.customerId as Titulo['customerId'],
        fornecedorId: null,
        orderId: input.orderId as Titulo['orderId'],
        numeroParcela: index + 1,
        totalDeParcelas: input.installments,
        valorOriginalCentavos: parcel.amountCentavos,
        vencimento: parcel.dueDate,
        status: 'ABERTO',
        liquidacoes: [],
        centroDeCustoId: null,
        categoriaId: null,
        renegociadoDe: null,
        renegociadoPara: [],
        criadoEm: now,
        criadoPor: context.userId as Titulo['criadoPor'],
      };
      let charge = await this.repository.create(
        {
          id,
          tenantId: context.tenantId,
          branchId: input.branchId,
          accountId: input.accountId,
          tituloId: id,
          amountCentavos: parcel.amountCentavos,
          dueDate: parcel.dueDate,
          status: 'PENDING',
          bank: null,
          input,
          installment: index + 1,
          createdAt: now,
        },
        titulo,
      );
      if (charge.status === 'PENDING') {
        const bank = await provider.createBoleto({
          referencia: id,
          valorCentavos: parcel.amountCentavos,
          vencimento: parcel.dueDate,
          pagador: input.payer,
          jurosMensalPercentual: input.interestPercent,
          multaPercentual: input.finePercent,
        });
        if (bank.status !== 'REGISTRADO')
          throw new BadRequestException('Provider não confirmou o registro do boleto');
        charge = await this.repository.transition(context.tenantId, id, ['PENDING'], {
          bank,
          status: parcel.dueDate < now.slice(0, 10) ? 'OVERDUE' : 'REGISTERED',
        });
      }
      result.push(charge);
    }
    return result;
  }
  async get(context: TenantContext, id: string) {
    const charge = await this.repository.get(context.tenantId, id);
    this.allowBranch(context, charge.branchId);
    return charge;
  }
  async list(context: TenantContext, branchId: string) {
    this.allowBranch(context, branchId);
    return this.repository.list(context.tenantId, branchId);
  }
  async secondCopy(context: TenantContext, id: string) {
    const charge = await this.get(context, id);
    if (!charge.bank) throw new BadRequestException('Boleto ainda não registrado');
    const provider = this.providers.resolve(
      await this.repository.account(context.tenantId, charge.accountId),
    );
    return provider.getBoleto(charge.bank.nossoNumero);
  }
  async cancel(context: TenantContext, id: string) {
    const charge = await this.get(context, id);
    if (charge.status === 'CANCELLED') return charge;
    if (charge.status === 'PAID') throw new BadRequestException('Boleto já pago');
    if (charge.bank) {
      const provider = this.providers.resolve(
        await this.repository.account(context.tenantId, charge.accountId),
      );
      await provider.cancelBoleto(charge.bank.nossoNumero);
    }
    return this.repository.cancel(context.tenantId, id);
  }
  async settleManual(
    context: TenantContext,
    id: string,
    input: { eventId: string; amountCentavos: number; note: string },
  ) {
    await this.get(context, id);
    return this.repository.settle(
      context.tenantId,
      id,
      `manual:${input.eventId}`,
      input.amountCentavos,
      context.userId,
      input.note,
    );
  }
  @Cron('0 5 0 * * *', { timeZone: 'America/Sao_Paulo' })
  async expire() {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    );
    await this.repository.markOverdue(today);
  }
}
