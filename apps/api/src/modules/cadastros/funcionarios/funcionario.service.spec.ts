import type { Auth, Firestore } from '@synapse/firebase/admin';
import type { AuditActor, PedidoDeVenda } from '@synapse/types';
import { funcionarioSchema } from '@synapse/validation';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { PedidoDeVendaRepository } from '../../credit/repositories/pedido-de-venda.repository';
import type { TenantContext } from '../../iam/iam.types';
import { MembershipRepository } from '../../iam/repositories/membership.repository';
import { RoleRepository } from '../../iam/repositories/role.repository';
import { RoleService } from '../../iam/services/role.service';
import { TabelaRepository } from '../tabelas/tabela.repository';
import { TabelaService } from '../tabelas/tabela.service';
import { FuncionarioRepository } from './funcionario.repository';
import { FuncionarioService } from './funcionario.service';
import { resumirVendedor } from './resumo-do-vendedor';

const contexto: TenantContext = {
  tenantId: 'empresa-a',
  userId: 'user-1',
  roleIds: ['ADMIN_EMPRESA'],
  branchIds: [],
  warehouseIds: [],
};

const autor: AuditActor = {
  uid: 'user-1' as AuditActor['uid'],
  email: '',
  name: 'Kaynan',
  source: 'api',
};

const entrada = (extra: Record<string, unknown> = {}) =>
  funcionarioSchema.parse({ nome: 'RENIER PANTOJA', admissao: '2026-01-05', ...extra });

const montar = () => {
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const auth = {
    getUsers: jest.fn(async (ids: { uid: string }[]) => ({
      users: ids.map(({ uid }) => ({
        uid,
        email: `${uid}@empresa.com`,
        displayName: uid.toUpperCase(),
      })),
    })),
    getUser: jest.fn(async (uid: string) => ({
      uid,
      email: `${uid}@empresa.com`,
      displayName: 'Renier',
    })),
  };
  const service = new FuncionarioService(
    new FuncionarioRepository(db),
    new TabelaService(new TabelaRepository(db), new RoleService(new RoleRepository())),
    new PedidoDeVendaRepository(db),
    new MembershipRepository(db),
    auth as unknown as Auth,
  );
  return { fake, service, auth };
};

describe('FuncionarioService', () => {
  it('cria com código sequencial e recusa CPF repetido', async () => {
    const { service } = montar();
    const renier = await service.criar(
      contexto,
      entrada({ documentos: { cpf: '52998224725' } }),
      autor,
    );
    const kaynan = await service.criar(contexto, entrada({ nome: 'KAYNAN CARVALHO' }), autor);
    expect([renier.codigo, kaynan.codigo]).toEqual([1, 2]);
    expect(renier.cargo).toEqual({ codigo: 1, nome: 'GERAL' });
    await expect(
      service.criar(
        contexto,
        entrada({ nome: 'OUTRO', documentos: { cpf: '529.982.247-25' } }),
        autor,
      ),
    ).rejects.toThrow(/1 - RENIER PANTOJA/);
  });

  it('vendedor do PDV: marcado como vendedor, sem bloqueio e sem demissão', async () => {
    const { service } = montar();
    await service.criar(contexto, entrada({ comissao: { vendedor: true } }), autor);
    await service.criar(
      contexto,
      entrada({ nome: 'BLOQUEADO', bloqueado: true, comissao: { vendedor: true } }),
      autor,
    );
    await service.criar(
      contexto,
      entrada({ nome: 'DEMITIDO', demissao: '2026-02-01', comissao: { vendedor: true } }),
      autor,
    );
    await service.criar(contexto, entrada({ nome: 'ESTOQUISTA' }), autor);
    const vendedores = await service.vendedoresAtivos(contexto);
    expect(vendedores.map((v) => v.nome)).toEqual(['RENIER PANTOJA']);
    expect((await service.vendedoresAtivos(contexto, '1')).map((v) => v.codigo)).toEqual([1]);
  });

  it('grava, lê e remove a foto fora da ficha', async () => {
    const { service } = montar();
    const criado = await service.criar(contexto, entrada(), autor);
    const conteudo = Buffer.from('imagem-jpeg');
    const comFoto = await service.gravarFoto(contexto, criado.id, {
      mimetype: 'image/jpeg',
      size: conteudo.length,
      buffer: conteudo,
    });
    expect(comFoto.fotoAtualizadaEm).toBeTruthy();
    expect((await service.lerFoto(contexto, criado.id)).conteudo.toString()).toBe('imagem-jpeg');
    await expect(
      service.gravarFoto(contexto, criado.id, {
        mimetype: 'application/pdf',
        size: 10,
        buffer: conteudo,
      }),
    ).rejects.toThrow(/JPG, PNG ou WEBP/);
    const semFoto = await service.removerFoto(contexto, criado.id);
    expect(semFoto.fotoAtualizadaEm).toBeNull();
    await expect(service.lerFoto(contexto, criado.id)).rejects.toThrow('Funcionário sem foto');
  });

  it('liga um login a um funcionário só', async () => {
    const { service, fake } = montar();
    fake.semear('tenants/empresa-a/users/uid-renier', {
      authUid: 'uid-renier',
      status: 'active',
      roleIds: ['VENDEDOR'],
    });
    const renier = await service.criar(contexto, entrada(), autor);
    const outro = await service.criar(contexto, entrada({ nome: 'OUTRO' }), autor);
    const ligado = await service.definirUsuario(contexto, renier.id, 'uid-renier', autor);
    expect(ligado.usuario).toEqual({
      uid: 'uid-renier',
      email: 'uid-renier@empresa.com',
      nome: 'Renier',
    });
    await expect(service.definirUsuario(contexto, outro.id, 'uid-renier', autor)).rejects.toThrow(
      /1 - RENIER PANTOJA/,
    );
    await expect(service.definirUsuario(contexto, outro.id, 'uid-de-fora', autor)).rejects.toThrow(
      /não pertence/,
    );
    const usuarios = await service.usuariosDoTenant(contexto);
    expect(usuarios).toEqual([
      expect.objectContaining({
        uid: 'uid-renier',
        funcionario: expect.objectContaining({ codigo: 1 }),
      }),
    ]);
    expect((await service.definirUsuario(contexto, renier.id, null, autor)).usuario).toBeNull();
  });
});

describe('resumirVendedor', () => {
  const pedido = (extra: Partial<PedidoDeVenda>): PedidoDeVenda =>
    ({
      id: Math.random().toString(36),
      customerId: 'c1',
      situacao: 'FATURADO',
      totalCentavos: 100_000,
      prazoMedioEmDias: 0,
      enviadoEm: '2026-09-10T10:00:00.000Z',
      ...extra,
    }) as PedidoDeVenda;

  it('soma o mês, ignora cancelado e calcula comissão à vista e a prazo', async () => {
    const { service } = montar();
    const funcionario = await service.criar(
      contexto,
      entrada({
        comissao: {
          vendedor: true,
          percentualAVista: 2,
          percentualAPrazo: 3,
          metaMensalCentavos: 1_000_000,
        },
      }),
      autor,
    );
    const resumo = resumirVendedor(
      funcionario,
      [
        pedido({ totalCentavos: 100_000 }),
        pedido({ totalCentavos: 200_000, prazoMedioEmDias: 30, customerId: 'c2' as never }),
        pedido({ totalCentavos: 50_000, situacao: 'AGUARDANDO_ANALISE' }),
        pedido({ totalCentavos: 999_999, situacao: 'CANCELADO' }),
        pedido({ totalCentavos: 70_000, enviadoEm: '2026-08-31T23:00:00.000Z' }),
      ],
      '2026-09',
    );
    expect(resumo).toMatchObject({
      pedidos: 3,
      vendidoCentavos: 350_000,
      faturadoCentavos: 300_000,
      // faturamento: 2% de 1.000,00 + 3% de 2.000,00
      comissaoPrevistaCentavos: 2_000 + 6_000,
      percentualDaMeta: 35,
      clientesAtendidos: 2,
    });
  });
});
