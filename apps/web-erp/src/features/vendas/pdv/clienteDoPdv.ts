import type { Customer } from '@synapse/types';

/** O cliente da venda do PDV: do cadastro, só com CPF/CNPJ na nota, ou o
 *  consumidor final. */
export interface ClienteDoPdv {
  readonly customerId: string | null;
  readonly codigo: string | null;
  readonly nome: string;
  readonly documento: string | null;
  readonly endereco: string | null;
}

export const CONSUMIDOR_FINAL: ClienteDoPdv = {
  customerId: null,
  codigo: null,
  nome: 'CONSUMIDOR FINAL',
  documento: null,
  endereco: null,
};

export const enderecoDoCliente = (cliente: Customer): string | null => {
  const endereco = cliente.address;
  const texto = [
    [endereco.street, endereco.number].filter(Boolean).join(', '),
    endereco.district,
    endereco.city ? `${endereco.city}/${endereco.state}` : null,
  ]
    .filter(Boolean)
    .join(' - ');
  return texto || null;
};
