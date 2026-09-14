import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import type { TenantContext } from '../../iam/iam.types';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { RoleService } from '../../iam/services/role.service';
import { TabelaRepository } from './tabela.repository';
import { TabelaService } from './tabela.service';

const contexto = (
  roleIds: string[] = ['ADMIN_EMPRESA'],
  tenantId = 'empresa-a',
): TenantContext => ({
  tenantId,
  userId: 'user-1',
  roleIds,
  branchIds: [],
  warehouseIds: [],
});

const montar = (db = new FakeFirestore()) => ({
  db,
  service: new TabelaService(
    new TabelaRepository(db as unknown as Firestore),
    new RoleService(new RoleRepository()),
  ),
});

describe('TabelaService', () => {
  it('toda tabela nasce com 1 - GERAL na primeira leitura, uma vez só', async () => {
    const { service } = montar();
    const [primeira, segunda] = [
      await service.listar(contexto(), 'pracas'),
      await service.listar(contexto(), 'pracas'),
    ];
    expect(primeira.map((item) => `${item.codigo} - ${item.nome}`)).toEqual(['1 - GERAL']);
    expect(segunda).toHaveLength(1);
  });

  it('formas de pagamento nascem com as do Syndata, bonificação no 7', async () => {
    const { service } = montar();
    const formas = await service.listar(contexto(), 'formas-de-pagamento');
    expect(formas.find((forma) => forma.codigo === 7)).toMatchObject({
      nome: 'BONIFICAÇÃO',
      meio: 'BONIFICACAO',
    });
  });

  it('cria com o próximo código e recusa nome repetido', async () => {
    const { service } = montar();
    const norte = await service.criar(contexto(), 'pracas', { nome: 'NORTE', ativo: true });
    const sul = await service.criar(contexto(), 'pracas', { nome: 'SUL', ativo: true });
    expect([norte.codigo, sul.codigo]).toEqual([2, 3]);
    await expect(
      service.criar(contexto(), 'pracas', { nome: 'NORTE', ativo: true }),
    ).rejects.toThrow(/código 2/);
  });

  it('renomeia e inativa, mas o código 1 continua ativo', async () => {
    const { service } = montar();
    const norte = await service.criar(contexto(), 'departamentos', { nome: 'VENDAS', ativo: true });
    const inativo = await service.alterar(contexto(), 'departamentos', norte.codigo, {
      nome: 'VENDAS EXTERNAS',
      ativo: false,
    });
    expect(inativo).toMatchObject({ nome: 'VENDAS EXTERNAS', ativo: false });
    await expect(
      service.alterar(contexto(), 'departamentos', 1, { nome: 'GERAL', ativo: false }),
    ).rejects.toThrow(/não pode ser inativado/);
  });

  it('só quem cuida da tabela escreve nela', async () => {
    const { service } = montar();
    await expect(
      service.criar(contexto(['CAIXA']), 'cargos', { nome: 'GERENTE', ativo: true }),
    ).rejects.toThrow(/funcionario.gerenciar/);
    await expect(service.listar(contexto(['CAIXA']), 'cargos')).resolves.toHaveLength(1);
  });

  it('referência de ficha devolve o nome gravado e recusa código inexistente', async () => {
    const { service } = montar();
    await service.criar(contexto(), 'cargos', { nome: 'VENDEDOR', ativo: true });
    await expect(
      service.referencia(contexto(), 'cargos', { codigo: 2, nome: 'nome velho' }, 'Cargo'),
    ).resolves.toEqual({ codigo: 2, nome: 'VENDEDOR' });
    await expect(
      service.referencia(contexto(), 'cargos', { codigo: 9, nome: 'X' }, 'Cargo'),
    ).rejects.toThrow(/Cargo: código 9/);
  });

  it('tabelas de um tenant não aparecem no outro', async () => {
    const { service, db } = montar();
    await service.criar(contexto(), 'pracas', { nome: 'NORTE', ativo: true });
    db.acessos.length = 0;
    const doOutro = await service.listar(contexto(['ADMIN_EMPRESA'], 'empresa-b'), 'pracas');
    expect(doOutro.map((item) => item.nome)).toEqual(['GERAL']);
    expect(db.caminhosTocados.some((path) => path.includes('empresa-a'))).toBe(false);
  });
});
