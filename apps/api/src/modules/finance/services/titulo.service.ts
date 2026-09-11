import { Injectable } from '@nestjs/common';
import type { Titulo } from '@synapse/types';
import { randomUUID } from 'node:crypto';
import { TituloRepository } from '../repositories/titulo.repository';

export interface CriarTituloInput {
  readonly tenantId: Titulo['tenantId'];
  readonly branchId: Titulo['branchId'];
  readonly tipo: Titulo['tipo'];
  readonly descricao: string;
  readonly fornecedorId: string | null;
  readonly customerId: Titulo['customerId'];
  readonly orderId: Titulo['orderId'];
  readonly valorOriginalCentavos: number;
  readonly vencimento: string;
  readonly criadoPor: Titulo['criadoPor'];
  readonly now: string;
}

/** Camada fina sobre o TituloRepository: só o suficiente para outro módulo
 *  (aqui, Compras e recebimento) gerar um título — liquidação, renegociação
 *  e os relatórios do §24 continuam em `entities/titulo.ts`, para o próprio
 *  módulo financeiro expor quando ganhar seus controllers. */
@Injectable()
export class TituloService {
  constructor(private readonly repository: TituloRepository) {}

  async criar(input: CriarTituloInput): Promise<Titulo> {
    const titulo: Titulo = {
      id: randomUUID(),
      tenantId: input.tenantId,
      branchId: input.branchId,
      tipo: input.tipo,
      descricao: input.descricao,
      customerId: input.customerId,
      fornecedorId: input.fornecedorId,
      orderId: input.orderId,
      numeroParcela: 1,
      totalDeParcelas: 1,
      valorOriginalCentavos: input.valorOriginalCentavos,
      vencimento: input.vencimento,
      status: 'ABERTO',
      liquidacoes: [],
      centroDeCustoId: null,
      categoriaId: null,
      renegociadoDe: null,
      renegociadoPara: [],
      criadoEm: input.now,
      criadoPor: input.criadoPor,
    };
    return this.repository.create(input.tenantId, titulo);
  }

  findById(tenantId: string, id: string): Promise<Titulo | null> {
    return this.repository.findById(tenantId, id);
  }

  listAll(tenantId: string): Promise<Titulo[]> {
    return this.repository.listAll(tenantId);
  }
}
