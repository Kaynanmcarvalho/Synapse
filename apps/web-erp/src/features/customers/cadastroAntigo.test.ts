import type { Customer } from '@synapse/types';
import { describe, expect, it } from 'vitest';
import { doCliente } from './formulario';
import { validar } from './validacao';

/** Cliente gravado antes da tela de cadastro, no formato do seed
 *  (scripts/seed-analise-de-credito.mjs) e da tela antiga do crédito: telefone
 *  com máscara, sem `telefones`, versão, criação, situação nem "ativo". Abrir e
 *  salvar esse cadastro não pode exigir nada além do que está errado de fato. */
const antigo = (taxId: string) =>
  ({
    id: 'cliente-dev-1',
    tenantId: 'tenant-dev',
    codigo: 'C-0042',
    type: 'PJ',
    name: 'Mercado do Bairro',
    legalName: 'Mercado do Bairro Comércio de Alimentos LTDA',
    taxId,
    stateRegistration: '10.123.456-7',
    phone: '(62) 3241-5566',
    whatsapp: '(62) 99812-4455',
    email: 'compras@mercadodobairro.com.br',
    address: {
      street: 'Rua T-37',
      number: '1450',
      complement: null,
      district: 'Setor Bueno',
      city: 'Goiânia',
      state: 'GO',
      postalCode: '74230020',
    },
    creditLimit: 1_500_000,
    updatedAt: '2026-08-04T10:00:00.000Z',
    updatedByName: 'Paulo Gerência',
  }) as unknown as Customer;

describe('cadastro gravado antes da tela nova', () => {
  it('com CNPJ válido, abre e passa na validação sem pedir mais nada', () => {
    expect(validar(doCliente(antigo('12345678000195')))).toEqual({});
  });

  it('com CNPJ inválido (o do seed), aponta só o CNPJ', () => {
    expect(validar(doCliente(antigo('12345678000190')))).toEqual({ documento: 'CNPJ inválido' });
  });
});
