import { ConflictException } from '@nestjs/common';
import { getAdminFirestore } from '@synapse/firebase/admin';
import type { Customer } from '@synapse/types';
import { clienteSchema } from '@synapse/validation';
import { ClienteService } from '../services/cliente.service';
import { ClienteRepository } from './cliente.repository';

/** O cadastro de clientes contra o emulador do Firestore: o mesmo caminho que a
 *  API usa em produção. Roda com `pnpm test:emulador`; sem FIRESTORE_EMULATOR_HOST
 *  fica de fora, e o `pnpm test` comum não depende do emulador.
 *
 *  Cada teste usa um tenant próprio: nada aqui encosta em dado de outro. */

const noEmulador = process.env['FIRESTORE_EMULATOR_HOST'] ? describe : describe.skip;

const montar = () => {
  const db = getAdminFirestore();
  const repositorio = new ClienteRepository(db);
  return { db, repositorio, service: new ClienteService(repositorio) };
};

noEmulador('cadastro de clientes no Firestore (emulador)', () => {
  jest.setTimeout(60_000);

  let emulador: ReturnType<typeof montar>;
  beforeAll(() => {
    emulador = montar();
  });
  afterAll(async () => {
    await emulador.db.terminate();
  });

  let tenantId = '';
  const contexto = () => ({
    tenantId,
    userId: 'user-1',
    roleIds: [],
    branchIds: [],
    warehouseIds: [],
  });

  const entrada = (extra: Record<string, unknown> = {}) =>
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
      telefones: { principal: '6232415566', celular: '62998124455' },
      creditLimit: 1_500_000,
      ...extra,
    });

  /** Como o seed e a tela antiga do crédito gravavam: sem índice de busca, sem
   *  criação, versão, situação e "ativo", e com `updatedBy` sendo só o uid. */
  const gravarClienteAntigo = () =>
    emulador.db.doc(`tenants/${tenantId}/customers/cliente-antigo`).set({
      id: 'cliente-antigo',
      tenantId,
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
    });

  beforeEach(() => {
    tenantId = `cadastro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  });

  it('grava, numera em sequência e lê de volta', async () => {
    const primeiro = await emulador.service.criar(contexto(), entrada());
    const segundo = await emulador.service.criar(
      contexto(),
      entrada({
        taxId: '19131243000197',
        name: 'Padaria Estrela',
        legalName: 'Padaria Estrela LTDA',
      }),
    );
    expect([primeiro.codigo, segundo.codigo]).toEqual(['C-0001', 'C-0002']);

    const lido = await emulador.repositorio.buscar(tenantId, primeiro.id);
    expect(lido).toMatchObject({
      name: 'Mercado do Bairro',
      taxId: '11222333000181',
      codigo: 'C-0001',
      telefones: { principal: '6232415566', celular: '62998124455' },
    });
  });

  it('dois cadastros do mesmo CPF/CNPJ: o segundo é recusado', async () => {
    await emulador.service.criar(contexto(), entrada());
    await expect(
      emulador.service.criar(contexto(), entrada({ name: 'Mesmo documento, outro nome' })),
    ).rejects.toBeInstanceOf(ConflictException);

    const todos = await emulador.repositorio.todos(tenantId);
    expect(todos).toHaveLength(1);
  });

  it('dois cadastros ao mesmo tempo não repetem código nem documento', async () => {
    const resultados = await Promise.allSettled([
      emulador.service.criar(contexto(), entrada({ taxId: '11222333000181' })),
      emulador.service.criar(contexto(), entrada({ taxId: '19131243000197' })),
      emulador.service.criar(contexto(), entrada({ taxId: '11222333000181' })),
    ]);
    const gravados = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    expect(gravados).toHaveLength(2);
    expect(new Set(gravados.map((c) => c.codigo)).size).toBe(2);
    expect(new Set(gravados.map((c) => c.taxId)).size).toBe(2);
  });

  it('atualizar mantém o documento único: não pode roubar o CNPJ de outro', async () => {
    const primeiro = await emulador.service.criar(contexto(), entrada());
    await emulador.service.criar(
      contexto(),
      entrada({
        taxId: '19131243000197',
        name: 'Padaria Estrela',
        legalName: 'Padaria Estrela LTDA',
      }),
    );
    await expect(
      emulador.service.atualizar(contexto(), primeiro.id, entrada({ taxId: '19131243000197' })),
    ).rejects.toBeInstanceOf(ConflictException);
    // O próprio documento continua podendo ser salvo.
    const mesmo = await emulador.service.atualizar(
      contexto(),
      primeiro.id,
      entrada({ name: 'Mercado do Bairro Centro' }),
    );
    expect(mesmo.name).toBe('Mercado do Bairro Centro');
  });

  it('busca por prefixo de nome, por cidade e por documento', async () => {
    await emulador.service.criar(contexto(), entrada());
    await emulador.service.criar(
      contexto(),
      entrada({
        taxId: '19131243000197',
        name: 'Padaria Estrela',
        legalName: 'Padaria Estrela LTDA',
        address: {
          street: 'Av. Rio Verde',
          number: '220',
          district: 'Garavelo',
          city: 'Aparecida de Goiânia',
          state: 'GO',
          postalCode: '74953010',
        },
      }),
    );

    const porNome = await emulador.repositorio.procurar(tenantId, 'merc', 10);
    expect(porNome.map((c) => c.name)).toEqual(['Mercado do Bairro']);

    const porCidade = await emulador.repositorio.procurar(tenantId, 'aparecida', 10);
    expect(porCidade.map((c) => c.name)).toEqual(['Padaria Estrela']);

    const porDocumento = await emulador.repositorio.procurar(tenantId, '19.131.243/0001-97', 10);
    expect(porDocumento.map((c) => c.name)).toEqual(['Padaria Estrela']);

    // Acento não atrapalha: o índice guarda sem acento.
    expect((await emulador.repositorio.procurar(tenantId, 'goiania', 10)).length).toBe(2);
  });

  it('o índice de busca acompanha a alteração do nome', async () => {
    const criado = await emulador.service.criar(contexto(), entrada());
    await emulador.service.atualizar(
      contexto(),
      criado.id,
      entrada({ name: 'Supermercado Novo', legalName: 'Supermercado Novo LTDA' }),
    );

    expect(await emulador.repositorio.procurar(tenantId, 'supermercado', 10)).toHaveLength(1);
    expect(await emulador.repositorio.procurar(tenantId, 'mercado do bairro', 10)).toHaveLength(0);
  });

  it('lista pagina pelo cursor, sem repetir cliente', async () => {
    for (const taxId of ['11222333000181', '19131243000197', '52998224725']) {
      await emulador.service.criar(
        contexto(),
        entrada({
          taxId,
          type: taxId.length === 11 ? 'PF' : 'PJ',
          name: `Cliente ${taxId}`,
          legalName: `Cliente ${taxId} LTDA`,
        }),
      );
    }
    const primeira = await emulador.repositorio.listar(tenantId, { limite: 2 });
    expect(primeira.itens).toHaveLength(2);
    expect(primeira.proximoCursor).not.toBeNull();

    const segunda = await emulador.repositorio.listar(tenantId, {
      limite: 2,
      cursor: primeira.proximoCursor,
    });
    expect(segunda.itens).toHaveLength(1);
    expect(segunda.proximoCursor).toBeNull();
    const ids = [...primeira.itens, ...segunda.itens].map((item) => item.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('sugere grupo, praça e segmento pelo que já foi usado', async () => {
    await emulador.service.criar(
      contexto(),
      entrada({
        classificacao: { grupo: 'ATACADO', subGrupo: 'REDE', pracaOuRegiao: 'GOIÂNIA SUL' },
        pessoaJuridica: { segmento: 'Varejo alimentar', ramoDeAtividade: 'Supermercado' },
      }),
    );
    await emulador.service.criar(
      contexto(),
      entrada({
        taxId: '19131243000197',
        name: 'Padaria Estrela',
        legalName: 'Padaria Estrela LTDA',
        classificacao: { grupo: 'VAREJO', pracaOuRegiao: 'GOIÂNIA SUL' },
      }),
    );

    const sugestoes = await emulador.repositorio.sugestoes(tenantId);
    expect(sugestoes.grupos).toEqual(['ATACADO', 'VAREJO']);
    expect(sugestoes.pracas).toEqual(['GOIÂNIA SUL']);
    expect(sugestoes.segmentos).toEqual(['Varejo alimentar']);
  });

  it('a situação financeira muda sem abrir a ficha inteira', async () => {
    const criado = await emulador.service.criar(contexto(), entrada());
    const bloqueado = await emulador.service.definirSituacaoFinanceira(
      tenantId,
      criado.id,
      'BLOCKED',
      { uid: 'financeiro' as never, email: '', name: 'Financeiro', source: 'api' },
    );
    expect(bloqueado).toMatchObject({ financialStatus: 'BLOCKED', version: 2 });
    const lido = (await emulador.repositorio.buscar(tenantId, criado.id)) as Customer;
    expect(lido.financialStatus).toBe('BLOCKED');
    expect(lido.name).toBe('Mercado do Bairro');
  });

  it('cliente antigo, sem índice nem data de criação, aparece na lista', async () => {
    await emulador.service.criar(contexto(), entrada());
    await gravarClienteAntigo();

    const pagina = await emulador.repositorio.listar(tenantId, { limite: 10 });
    expect(pagina.itens.map((item) => item.nome)).toEqual(['Mercado do Bairro', 'Padaria Estrela']);
    expect(pagina.itens[1]).toMatchObject({
      ativo: true,
      situacao: 'REGULAR',
      limiteCentavos: 600_000,
      cidade: 'Aparecida de Goiânia',
    });
  });

  it('cadastro sem tipo, endereço, situação nem saldo é lido com os padrões da tela', async () => {
    // O formato da massa de volume (scripts/seed-performance.mjs).
    await emulador.db.doc(`tenants/${tenantId}/customers/carga-7`).set({
      id: 'carga-7',
      tenantId,
      name: 'Cliente 7',
      taxId: '00000000007',
      createdAt: '2026-08-04T10:00:00.000Z',
    });

    expect(await emulador.repositorio.buscar(tenantId, 'carga-7')).toMatchObject({
      type: 'PF',
      phone: '',
      address: { city: '', state: '', complement: null },
      creditLimit: 0,
      openCredit: 0,
      financialStatus: 'REGULAR',
      active: true,
    });
    const pagina = await emulador.repositorio.listar(tenantId, { limite: 10 });
    expect(pagina.itens).toEqual([
      expect.objectContaining({ id: 'carga-7', cidade: '', telefone: '', ativo: true }),
    ]);
  });

  it('a primeira busca sem resultado indexa o cliente antigo, e só o índice muda', async () => {
    await emulador.service.criar(contexto(), entrada());
    await gravarClienteAntigo();

    const achados = await emulador.repositorio.procurar(tenantId, 'padaria', 10);
    expect(achados.map((cliente) => cliente.id)).toEqual(['cliente-antigo']);

    // O índice ficou gravado: a consulta comum, por token, já o encontra.
    const porToken = await emulador.db
      .collection(`tenants/${tenantId}/customers`)
      .where('searchTokens', 'array-contains', 'estrela')
      .get();
    expect(porToken.docs.map((documento) => documento.id)).toEqual(['cliente-antigo']);
    const marca = await emulador.db.doc(`tenants/${tenantId}/contadores/customers-indice`).get();
    expect(marca.get('completo')).toBe(true);

    const lido = (await emulador.repositorio.buscar(tenantId, 'cliente-antigo')) as Customer;
    expect(lido).toMatchObject({
      name: 'Padaria Estrela',
      creditLimit: 600_000,
      updatedBy: 'uid-antigo',
    });
    expect(lido.createdAt).toBeUndefined();

    // Tenant marcado: termo que não existe não relê a carteira, só não acha.
    expect(await emulador.repositorio.procurar(tenantId, 'inexistente', 10)).toEqual([]);
  });

  it('cliente antigo salvo pela tela ganha versão e criação, sem NaN', async () => {
    await gravarClienteAntigo();
    await emulador.service.atualizar(
      contexto(),
      'cliente-antigo',
      entrada({
        taxId: '19131243000197',
        name: 'Padaria Estrela',
        legalName: 'Padaria Estrela Panificação LTDA',
      }),
    );
    const lido = (await emulador.repositorio.buscar(tenantId, 'cliente-antigo')) as Customer;
    expect(lido).toMatchObject({
      version: 1,
      openCredit: 0,
      createdAt: '2026-08-04T10:00:00.000Z',
      active: true,
      financialStatus: 'REGULAR',
    });
    expect(lido.createdBy.name).toBe('Cadastro anterior (autor não registrado)');
    expect(await emulador.repositorio.procurar(tenantId, 'estrela', 10)).toHaveLength(1);
  });
});
