import { Injectable } from '@nestjs/common';
import type { CadastroDoCliente, Customer } from '@synapse/types';
import { ClienteRepository as CadastroDeClientes } from '../../catalog/repositories/cliente.repository';

/** O cadastro do cliente visto pela análise de crédito — só leitura.
 *
 *  Quem grava cliente é a tela de cadastro (`catalog/customers`), e é de lá que
 *  estes dados vêm: um cliente, um documento. A análise mostra limite, situação
 *  e endereço; mudar qualquer um deles é abrir o cadastro.
 *
 *  Devolve só os campos da ficha: o documento guarda também tenantId e autoria,
 *  que não interessam à decisão de crédito. */
@Injectable()
export class ClienteRepository {
  constructor(private readonly cadastro: CadastroDeClientes) {}

  async buscar(tenantId: string, id: string): Promise<CadastroDoCliente | null> {
    const cliente = await this.cadastro.buscar(tenantId, id);
    return cliente ? paraCadastro(cliente) : null;
  }

  /** Vários cadastros numa ida só: a fila lê todos os clientes dela. */
  async buscarVarios(
    tenantId: string,
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, CadastroDoCliente>> {
    const clientes = await this.cadastro.buscarVarios(tenantId, ids);
    return new Map([...clientes].map(([id, cliente]) => [id, paraCadastro(cliente)]));
  }
}

/** Telefones: cliente antigo só tinha `phone` e `whatsapp` soltos. */
const contatoDe = (cliente: Customer): Pick<CadastroDoCliente, 'phone' | 'whatsapp' | 'email'> => ({
  phone: cliente.telefones?.principal ?? cliente.phone ?? '',
  whatsapp: cliente.telefones?.whatsapp ?? cliente.whatsapp ?? null,
  email: cliente.email ?? null,
});

/** O que a política de crédito lê do cadastro. */
const creditoDe = (
  cliente: Customer,
): Pick<
  CadastroDoCliente,
  'creditLimit' | 'financialStatus' | 'diasParaBloqueio' | 'autorizacaoDePagamento'
> => ({
  creditLimit: cliente.creditLimit ?? 0,
  financialStatus: cliente.financialStatus ?? null,
  diasParaBloqueio: cliente.controleDeVendas?.diasParaBloqueio ?? null,
  autorizacaoDePagamento: cliente.controleDeVendas?.autorizacaoDePagamento ?? 'SEM_RESTRICAO',
});

const paraCadastro = (cliente: Customer): CadastroDoCliente => ({
  id: cliente.id,
  codigo: cliente.codigo ?? null,
  type: cliente.type,
  name: cliente.name,
  legalName: cliente.legalName ?? null,
  taxId: cliente.taxId ?? '',
  stateRegistration: cliente.stateRegistration ?? null,
  address: cliente.address,
  ...contatoDe(cliente),
  ...creditoDe(cliente),
  updatedAt: cliente.updatedAt ?? null,
  updatedByName: cliente.updatedBy?.name || cliente.updatedBy?.email || null,
});
