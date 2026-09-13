import { NotFoundException } from '@nestjs/common';
import type { Customer } from '@synapse/types';
import { clienteSchema, type ClienteInput } from '@synapse/validation';
import type { ClienteRepository } from '../repositories/cliente.repository';
import { paraLista } from '../repositories/cliente.repository';
import { ClienteService } from './cliente.service';

const contexto = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roleIds: [],
  branchIds: [],
  warehouseIds: [],
};

const entrada = (extra: Record<string, unknown> = {}): ClienteInput =>
  clienteSchema.parse({
    type: 'PJ',
    taxId: '11222333000181',
    name: 'Mercado do Bairro',
    legalName: 'Mercado do Bairro LTDA',
    address: {
      street: 'Rua T-37',
      number: '1450',
      district: 'Setor Bueno',
      city: 'Goiânia',
      state: 'GO',
      postalCode: '74230020',
    },
    telefones: { principal: '6232415566' },
    creditLimit: 1_500_000,
    ...extra,
  });

/** Repositório em memória com a semântica do real: código sequencial na
 *  criação e documento único por tenant. */
class ClientesEmMemoria {
  readonly dados = new Map<string, Customer>();
  private numero = 0;

  criar = async (cliente: Customer) => {
    this.recusarRepetido(cliente);
    this.numero += 1;
    const gravado = { ...cliente, codigo: `C-${String(this.numero).padStart(4, '0')}` };
    this.dados.set(gravado.id, gravado);
    return gravado;
  };
  atualizar = async (cliente: Customer) => {
    if (!this.dados.has(cliente.id)) throw new NotFoundException('Cliente não encontrado');
    this.recusarRepetido(cliente);
    this.dados.set(cliente.id, cliente);
    return cliente;
  };
  buscar = async (_t: string, id: string) => this.dados.get(id) ?? null;
  alterar = async (_t: string, id: string, mudar: (c: Customer) => Customer) => {
    const atual = this.dados.get(id);
    if (!atual) throw new NotFoundException('Cliente não encontrado');
    const alterado = mudar(atual);
    this.dados.set(id, alterado);
    return alterado;
  };
  todos = async () => [...this.dados.values()];
  procurar = async (_t: string, termo: string) =>
    [...this.dados.values()].filter((cliente) =>
      `${cliente.name} ${cliente.taxId}`.toLowerCase().includes(termo.toLowerCase()),
    );
  listar = async (_t: string, opcoes: { limite: number }) => ({
    itens: [...this.dados.values()].slice(0, opcoes.limite).map(paraLista),
    proximoCursor: null,
    total: null,
  });
  private recusarRepetido(cliente: Customer) {
    const outro = [...this.dados.values()].find(
      (item) => item.taxId === cliente.taxId && item.id !== cliente.id,
    );
    if (outro) throw new Error('Já existe cliente com este CPF/CNPJ');
  }
}

const montar = () => {
  const repositorio = new ClientesEmMemoria();
  return {
    repositorio,
    service: new ClienteService(repositorio as unknown as ClienteRepository),
  };
};

describe('ClienteService — criar', () => {
  it('grava a ficha inteira, com autoria e versão', async () => {
    const { service } = montar();
    const cliente = await service.criar(contexto, entrada());
    expect(cliente).toMatchObject({
      name: 'Mercado do Bairro',
      taxId: '11222333000181',
      codigo: 'C-0001',
      openCredit: 0,
      version: 1,
      financialStatus: 'REGULAR',
      active: true,
    });
    expect(cliente.createdBy.uid).toBe('user-1');
    expect(cliente.telefones?.principal).toBe('6232415566');
    // phone continua preenchido: e o que a busca e a NF-e ja liam.
    expect(cliente.phone).toBe('6232415566');
  });

  it('numera os clientes em sequência', async () => {
    const { service } = montar();
    await service.criar(contexto, entrada());
    const segundo = await service.criar(contexto, entrada({ taxId: '19131243000197' }));
    expect(segundo.codigo).toBe('C-0002');
  });

  it('pessoa física não guarda bloco de pessoa jurídica', async () => {
    const { service } = montar();
    const cliente = await service.criar(
      contexto,
      entrada({
        type: 'PF',
        taxId: '52998224725',
        pessoaJuridica: { socios: [{ nome: 'João da Silva' }] },
      }),
    );
    expect(cliente.pessoaJuridica).toBeNull();
  });

  it('referência comercial ganha id, autor e horário', async () => {
    const { service } = montar();
    const cliente = await service.criar(
      contexto,
      entrada({ referenciasComerciais: [{ empresa: 'Distribuidora Norte' }] }),
    );
    const referencia = cliente.referenciasComerciais?.[0];
    expect(referencia?.id).toEqual(expect.any(String));
    expect(referencia?.registradaEm).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
    expect(referencia?.registradaPorNome).toBe('user-1');
  });

  it('CPF/CNPJ repetido é recusado pelo repositório', async () => {
    const { service } = montar();
    await service.criar(contexto, entrada());
    await expect(service.criar(contexto, entrada({ name: 'Outro nome' }))).rejects.toThrow(
      'Já existe cliente',
    );
  });
});

describe('ClienteService — atualizar', () => {
  it('mantém código, saldo em aberto e autoria da criação; sobe a versão', async () => {
    const { service, repositorio } = montar();
    const criado = await service.criar(contexto, entrada());
    repositorio.dados.set(criado.id, { ...criado, openCredit: 42_000 });

    const alterado = await service.atualizar(
      { ...contexto, userId: 'user-2' },
      criado.id,
      entrada({ name: 'Mercado do Bairro II', creditLimit: 2_000_000 }),
    );
    expect(alterado).toMatchObject({
      codigo: 'C-0001',
      openCredit: 42_000,
      creditLimit: 2_000_000,
      name: 'Mercado do Bairro II',
      version: 2,
    });
    expect(alterado.createdBy.uid).toBe('user-1');
    expect(alterado.updatedBy.uid).toBe('user-2');
  });

  it('salvar o cadastro não tira o cliente de inadimplente', async () => {
    const { service, repositorio } = montar();
    const criado = await service.criar(contexto, entrada());
    repositorio.dados.set(criado.id, { ...criado, financialStatus: 'OVERDUE' });

    const alterado = await service.atualizar(contexto, criado.id, entrada());
    expect(alterado.financialStatus).toBe('OVERDUE');
  });

  it('mas bloquear pelo cadastro continua valendo', async () => {
    const { service, repositorio } = montar();
    const criado = await service.criar(contexto, entrada());
    repositorio.dados.set(criado.id, { ...criado, financialStatus: 'OVERDUE' });

    const alterado = await service.atualizar(
      contexto,
      criado.id,
      entrada({ financialStatus: 'BLOCKED' }),
    );
    expect(alterado.financialStatus).toBe('BLOCKED');
  });

  it('referência já gravada mantém quem anotou e quando', async () => {
    const { service } = montar();
    const criado = await service.criar(
      contexto,
      entrada({ referenciasComerciais: [{ empresa: 'Distribuidora Norte' }] }),
    );
    const original = criado.referenciasComerciais?.[0];

    const alterado = await service.atualizar(
      { ...contexto, userId: 'outro' },
      criado.id,
      entrada({
        referenciasComerciais: [
          { id: original?.id, empresa: 'Distribuidora Norte', contato: 'Seu Zé' },
        ],
      }),
    );
    expect(alterado.referenciasComerciais?.[0]).toMatchObject({
      id: original?.id,
      contato: 'Seu Zé',
      registradaEm: original?.registradaEm,
      registradaPorNome: 'user-1',
    });
  });

  it('cliente que não existe não é atualizado', async () => {
    const { service } = montar();
    await expect(service.atualizar(contexto, 'nao-existe', entrada())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('ClienteService — lista e LGPD', () => {
  const criarTres = async (service: ClienteService) => {
    await service.criar(contexto, entrada({ classificacao: { grupo: 'ATACADO' } }));
    await service.criar(
      contexto,
      entrada({ taxId: '19131243000197', name: 'Padaria Estrela', active: false }),
    );
    await service.criar(
      contexto,
      entrada({
        taxId: '52998224725',
        type: 'PF',
        name: 'Maria Silva',
        financialStatus: 'BLOCKED',
      }),
    );
  };

  it('filtra por grupo, situação e ativo', async () => {
    const { service } = montar();
    await criarTres(service);
    expect((await service.listar('tenant-1', { limite: 50, grupo: 'ATACADO' })).itens).toHaveLength(
      1,
    );
    expect(
      (await service.listar('tenant-1', { limite: 50, situacao: 'BLOCKED' })).itens[0]?.nome,
    ).toBe('Maria Silva');
    expect((await service.listar('tenant-1', { limite: 50, ativo: false })).itens[0]?.nome).toBe(
      'Padaria Estrela',
    );
  });

  it('busca por termo devolve a linha da lista', async () => {
    const { service } = montar();
    await criarTres(service);
    const pagina = await service.listar('tenant-1', { limite: 50, termo: 'padaria' });
    expect(pagina.itens).toHaveLength(1);
    expect(pagina.itens[0]).toMatchObject({
      nome: 'Padaria Estrela',
      cidade: 'Goiânia',
      uf: 'GO',
      ativo: false,
    });
  });

  it('anonimiza sem dívida e recusa com crédito em aberto', async () => {
    const { service, repositorio } = montar();
    const criado = await service.criar(contexto, entrada());
    const ator = { uid: 'user-1' as never, email: '', name: '', source: 'api' as const };

    repositorio.dados.set(criado.id, { ...criado, openCredit: 100 });
    expect(await service.anonimizar('tenant-1', criado.id, ator)).toBeNull();

    repositorio.dados.set(criado.id, { ...criado, openCredit: 0 });
    const anonimo = await service.anonimizar('tenant-1', criado.id, ator);
    expect(anonimo).toMatchObject({
      name: 'Cliente anonimizado',
      taxId: '00000000000',
      email: null,
      pessoaJuridica: null,
    });
    expect(anonimo?.referenciasComerciais).toEqual([]);
  });
});

describe('ClienteService — cadastro gravado antes desta tela', () => {
  /** Como o seed e a tela antiga do crédito gravavam: sem versão, criação,
   *  saldo, situação e "ativo", e com `updatedBy` sendo só o uid. */
  const antigo = {
    id: 'cliente-antigo',
    tenantId: 'tenant-1',
    type: 'PJ',
    name: 'Padaria Estrela',
    legalName: 'Padaria Estrela Panificação LTDA',
    taxId: '19131243000197',
    phone: '(62) 3283-9090',
    address: {
      street: 'Avenida Rio Verde',
      number: '220',
      complement: null,
      district: 'Garavelo',
      city: 'Aparecida de Goiânia',
      state: 'GO',
      postalCode: '74953010',
    },
    creditLimit: 600_000,
    updatedAt: '2026-08-04T10:00:00.000Z',
    updatedBy: 'uid-antigo',
  } as unknown as Customer;

  it('entra na lista como ativo e liberado, e nos filtros também', async () => {
    const { service, repositorio } = montar();
    repositorio.dados.set(antigo.id, antigo);
    const ativos = await service.listar('tenant-1', { limite: 50, ativo: true });
    expect(ativos.itens[0]).toMatchObject({
      nome: 'Padaria Estrela',
      ativo: true,
      situacao: 'REGULAR',
      limiteCentavos: 600_000,
    });
    const liberados = await service.listar('tenant-1', { limite: 50, situacao: 'REGULAR' });
    expect(liberados.itens).toHaveLength(1);
  });

  it('salva sem NaN na versão e sem dar a criação a quem edita agora', async () => {
    const { service, repositorio } = montar();
    repositorio.dados.set(antigo.id, antigo);
    const salvo = await service.atualizar(
      { ...contexto, userId: 'quem-edita' },
      antigo.id,
      entrada({ taxId: '19131243000197', name: 'Padaria Estrela' }),
    );
    expect(salvo).toMatchObject({
      version: 1,
      openCredit: 0,
      createdAt: '2026-08-04T10:00:00.000Z',
    });
    expect(salvo.createdBy.name).toBe('Cadastro anterior (autor não registrado)');
    expect(salvo.updatedBy.uid).toBe('quem-edita');
  });

  it('bloqueio e anonimização também funcionam sem versão gravada', async () => {
    const { service, repositorio } = montar();
    repositorio.dados.set(antigo.id, antigo);
    const ator = {
      uid: 'financeiro' as never,
      email: '',
      name: 'Financeiro',
      source: 'api' as const,
    };
    expect(
      await service.definirSituacaoFinanceira('tenant-1', antigo.id, 'BLOCKED', ator),
    ).toMatchObject({ financialStatus: 'BLOCKED', version: 1 });
    expect(await service.anonimizar('tenant-1', antigo.id, ator)).toMatchObject({
      name: 'Cliente anonimizado',
      version: 2,
    });
  });
});

describe('ClienteService — autoria', () => {
  const ana = {
    uid: 'user-1' as never,
    email: 'ana@empresa.com',
    name: 'Ana Cadastro',
    source: 'api' as const,
  };
  const beto = {
    uid: 'user-2' as never,
    email: 'beto@empresa.com',
    name: '',
    source: 'api' as const,
  };

  it('o nome de quem salvou vai para a criação, a alteração e a referência anotada', async () => {
    const { service } = montar();
    const criado = await service.criar(
      contexto,
      entrada({ referenciasComerciais: [{ empresa: 'Distribuidora Norte' }] }),
      ana,
    );
    expect(criado.createdBy).toMatchObject({ uid: 'user-1', name: 'Ana Cadastro' });
    expect(criado.referenciasComerciais?.[0]?.registradaPorNome).toBe('Ana Cadastro');

    const alterado = await service.atualizar(
      { ...contexto, userId: 'user-2' },
      criado.id,
      entrada({
        referenciasComerciais: [
          { id: criado.referenciasComerciais?.[0]?.id, empresa: 'Distribuidora Norte' },
          { empresa: 'Atacadão' },
        ],
      }),
      beto,
    );
    expect(alterado.createdBy.name).toBe('Ana Cadastro');
    expect(alterado.updatedBy).toMatchObject({ uid: 'user-2', email: 'beto@empresa.com' });
    // Sem nome no token, a referência nova leva o e-mail; a antiga mantém quem anotou.
    expect(alterado.referenciasComerciais?.map((item) => item.registradaPorNome)).toEqual([
      'Ana Cadastro',
      'beto@empresa.com',
    ]);
  });
});
