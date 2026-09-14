import type { PedidoDeVenda } from '@synapse/types';
import { ClienteRepository } from '../../catalog/repositories/cliente.repository';
import { EmpresaDaImpressaoService } from '../../cadastros/impressao/empresa-da-impressao.service';
import { FuncionarioRepository } from '../../cadastros/funcionarios/funcionario.repository';
import { TabelaRepository } from '../../cadastros/tabelas/tabela.repository';
import { TabelaService } from '../../cadastros/tabelas/tabela.service';
import type { RegistrarPedidoInput } from '../../credit/dto/credito.schemas';
import { PedidoDeVendaRepository } from '../../credit/repositories/pedido-de-venda.repository';
import type { AnaliseDeCreditoService } from '../../credit/services/analise-de-credito.service';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { RoleService } from '../../iam/services/role.service';
import {
  CONTEXTO_DO_CAIXA as contexto,
  montarPdv,
  produtoDeTeste,
  vendedorDeTeste,
} from '../../../../test/pdv-de-teste';
import { lerCondicao, pedidoDeBalcaoSchema } from './pedido-de-balcao.schemas';
import { PedidoDeBalcaoService } from './pedido-de-balcao.service';

const ATOR = { uid: 'operador-1', nome: 'Operador' };

const montar = async () => {
  const pdv = montarPdv();
  const registrados: RegistrarPedidoInput[] = [];
  const analise = {
    registrar: jest.fn(async (_c: unknown, _a: unknown, input: RegistrarPedidoInput) => {
      registrados.push(input);
      return { id: 'pedido-1', numero: 2019, ...input } as unknown as PedidoDeVenda;
    }),
  } as unknown as AnaliseDeCreditoService;
  const service = new PedidoDeBalcaoService(
    analise,
    new PedidoDeVendaRepository(pdv.db),
    new ClienteRepository(pdv.db),
    pdv.produtos,
    pdv.pricing,
    new FuncionarioRepository(pdv.db),
    new TabelaService(new TabelaRepository(pdv.db), new RoleService(new RoleRepository())),
    new EmpresaDaImpressaoService(pdv.db),
  );
  await pdv.produtos.save(produtoDeTeste('start-25', 98.96));
  pdv.fake.semear(
    'tenants/tenant/funcionarios/func-44',
    vendedorDeTeste({ id: 'func-44', codigo: 44, nome: 'TULIO VARGAS' }) as never,
  );
  pdv.fake.semear('tenants/tenant/customers/c-1503', {
    id: 'c-1503',
    tenantId: 'tenant',
    codigo: 'C-1503',
    name: 'MUNDO DOS PETS',
    legalName: 'THIAGO PEREIRA GOMES',
    taxId: '34281018000120',
    active: true,
    address: {
      street: 'AV DOUTOR IGNACIO',
      number: 'S/N',
      district: 'EXPANSUL',
      city: 'APARECIDA DE GOIANIA',
      state: 'GO',
      postalCode: '74986310',
    },
  });
  return { ...pdv, service, registrados };
};

const entrada = (extra: Record<string, unknown> = {}) =>
  pedidoDeBalcaoSchema.parse({
    branchId: 'matriz',
    customerId: 'c-1503',
    funcionarioId: 'func-44',
    formaDePagamentoCodigo: 1,
    itens: [{ productId: 'start-25', quantidade: 2_000 }],
    ...extra,
  });

describe('PedidoDeBalcaoService', () => {
  it('monta o pedido com o preço do catálogo, dados do cliente e o vendedor do cadastro', async () => {
    const { service, registrados } = await montar();
    await service.registrar(contexto, ATOR, entrada({ condicaoDePagamento: '28/35/42' }));
    expect(registrados[0]).toMatchObject({
      origem: 'BALCAO',
      tipo: 'VENDA',
      clienteNome: 'MUNDO DOS PETS',
      clienteDocumento: '34281018000120',
      vendedorNome: 'TULIO VARGAS',
      vendedorCodigo: 44,
      funcionarioId: 'func-44',
      formaDePagamento: '1 - DINHEIRO',
      condicaoDePagamento: '28/35/42 dias',
      vencimentosEmDias: [28, 35, 42],
      itens: [
        {
          productId: 'start-25',
          descricao: 'RACAO START-25',
          quantidade: 2_000,
          precoUnitarioCentavos: 9_896,
          descontoCentavos: 0,
          codigo: 'SKU-start-25',
          unidade: 'SC',
          pesoUnitarioKg: 25,
        },
      ],
    });
  });

  it('bonificação da tabela vira pedido do tipo BONIFICACAO', async () => {
    const { service, registrados } = await montar();
    await service.registrar(contexto, ATOR, entrada({ formaDePagamentoCodigo: 7 }));
    expect(registrados[0]).toMatchObject({
      tipo: 'BONIFICACAO',
      formaDePagamento: '7 - BONIFICAÇÃO',
    });
  });

  it('preço negociado menor vira desconto e passa pelo limite do vendedor', async () => {
    const { service, registrados } = await montar();
    await service.registrar(
      contexto,
      ATOR,
      entrada({
        itens: [{ productId: 'start-25', quantidade: 1_000, precoNegociadoCentavos: 9_000 }],
      }),
    );
    expect(registrados[0]?.itens[0]).toMatchObject({
      precoUnitarioCentavos: 9_896,
      descontoCentavos: 896,
    });
    await expect(
      service.registrar(
        contexto,
        ATOR,
        entrada({
          itens: [{ productId: 'start-25', quantidade: 1_000, precoNegociadoCentavos: 8_000 }],
        }),
      ),
    ).rejects.toThrow(/passa do limite de 10% de TULIO VARGAS/);
  });

  it('recusa cliente, vendedor e produto que não existem', async () => {
    const { service } = await montar();
    await expect(
      service.registrar(contexto, ATOR, entrada({ customerId: 'nao-existe' })),
    ).rejects.toThrow('Cliente não encontrado');
    await expect(
      service.registrar(contexto, ATOR, entrada({ funcionarioId: 'nao-existe' })),
    ).rejects.toThrow('Vendedor não encontrado');
    await expect(
      service.registrar(
        contexto,
        ATOR,
        entrada({ itens: [{ productId: 'sumiu', quantidade: 1_000 }] }),
      ),
    ).rejects.toThrow('não existe mais');
  });
});

describe('lerCondicao', () => {
  it.each([
    ['', [], 'À vista'],
    ['0', [], 'À vista'],
    ['à vista', [], 'À vista'],
    ['30', [30], '30 dias'],
    ['28/35/42', [28, 35, 42], '28/35/42 dias'],
    ['30 60 90', [30, 60, 90], '30/60/90 dias'],
  ])('"%s" vira %j', (texto, dias, rotulo) => {
    expect(lerCondicao(texto)).toEqual({ dias, rotulo });
  });
});
