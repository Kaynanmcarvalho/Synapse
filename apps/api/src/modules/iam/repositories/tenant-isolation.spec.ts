import type { Firestore } from '@synapse/firebase/admin';
import { FakeFirestore } from '../../../../test/fake-firestore';
import { MembershipRepository } from './membership.repository';
import { SessionRepository } from './session.repository';

const TENANT_A = 'empresa-a';
const TENANT_B = 'empresa-b';
const USUARIO = 'uid-1';

/** c4-5: vazamento entre dois tenants.
 *
 *  Os dois tenants tem um usuario com o MESMO uid — o caso em que um erro de
 *  escopo passaria despercebido, porque a consulta ainda devolveria algo. */
describe('isolamento entre tenants', () => {
  let db: FakeFirestore;
  let memberships: MembershipRepository;
  let sessions: SessionRepository;

  beforeEach(() => {
    db = new FakeFirestore();
    db.semear(`tenants/${TENANT_A}/users/${USUARIO}`, {
      authUid: USUARIO,
      status: 'active',
      roleIds: ['VENDEDOR'],
      branchIds: ['filial-a'],
      warehouseIds: [],
      mfaRequired: false,
    });
    db.semear(`tenants/${TENANT_B}/users/${USUARIO}`, {
      authUid: USUARIO,
      status: 'active',
      roleIds: ['ADMIN_EMPRESA'],
      branchIds: ['filial-b'],
      warehouseIds: [],
      mfaRequired: true,
    });
    db.semear(`tenants/${TENANT_B}/users/${USUARIO}/sessions/sessao-b`, {
      id: 'sessao-b',
      deviceId: 'aparelho-b',
      revokedAt: null,
    });

    memberships = new MembershipRepository(db as unknown as Firestore);
    sessions = new SessionRepository(db as unknown as Firestore);
  });

  it('devolve o vinculo do tenant pedido, e nao o do outro', async () => {
    const naEmpresaA = await memberships.find(TENANT_A, USUARIO);
    const naEmpresaB = await memberships.find(TENANT_B, USUARIO);

    expect(naEmpresaA?.roleIds).toEqual(['VENDEDOR']);
    expect(naEmpresaB?.roleIds).toEqual(['ADMIN_EMPRESA']);
  });

  it('nao encosta em caminho de outro tenant ao ler um vinculo', async () => {
    await memberships.find(TENANT_A, USUARIO);

    expect(db.caminhosTocados).toEqual([`tenants/${TENANT_A}/users/${USUARIO}`]);
    expect(db.caminhosTocados.some((path) => path.includes(TENANT_B))).toBe(false);
  });

  it('nao enxerga sessao de outro tenant, mesmo com o uid igual', async () => {
    const daEmpresaA = await sessions.list(TENANT_A, USUARIO);

    expect(daEmpresaA).toEqual([]);
    expect(db.caminhosTocados.every((path) => path.startsWith(`tenants/${TENANT_A}/`))).toBe(true);
  });

  it('revoga so as sessoes do proprio tenant', async () => {
    await sessions.revokeAll(TENANT_A, USUARIO);

    expect(db.conteudo(`tenants/${TENANT_B}/users/${USUARIO}/sessions/sessao-b`)?.revokedAt).toBe(
      null,
    );
  });

  it('bloquear na empresa A nao altera o vinculo na empresa B', async () => {
    await memberships.setStatus(TENANT_A, USUARIO, 'blocked', 'uid-admin');

    expect(db.conteudo(`tenants/${TENANT_A}/users/${USUARIO}`)?.status).toBe('blocked');
    expect(db.conteudo(`tenants/${TENANT_B}/users/${USUARIO}`)?.status).toBe('active');
  });

  // O updatedBy tem que ser quem agiu. Gravar o alvo registraria a vitima como
  // autora da propria alteracao, e a auditoria apontaria para o lado errado.
  it('grava em updatedBy quem agiu, e nao o alvo', async () => {
    await memberships.setMfaRequired(TENANT_A, USUARIO, true, 'uid-admin');

    const vinculo = db.conteudo(`tenants/${TENANT_A}/users/${USUARIO}`);
    expect(vinculo?.updatedBy).toBe('uid-admin');
    expect(vinculo?.mfaRequired).toBe(true);
  });

  it('escreve a sessao debaixo do tenant e do usuario donos dela', async () => {
    const sessao = await sessions.create(TENANT_A, USUARIO, {
      deviceId: 'aparelho-a',
      name: 'Notebook',
      platform: 'web',
    });

    expect(db.conteudo(`tenants/${TENANT_A}/users/${USUARIO}/sessions/${sessao.id}`)).toBeDefined();
    expect(db.caminhosTocados.every((path) => path.startsWith(`tenants/${TENANT_A}/`))).toBe(true);
  });

  it('nao valida sessao do outro tenant', async () => {
    expect(await sessions.isActive(TENANT_A, USUARIO, 'sessao-b')).toBe(false);
    expect(await sessions.isActive(TENANT_B, USUARIO, 'sessao-b')).toBe(true);
  });
});
