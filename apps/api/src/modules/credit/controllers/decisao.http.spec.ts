import {
  type CallHandler,
  type ExecutionContext,
  type INestApplication,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { PedidoDeVenda } from '@synapse/types';
import request from 'supertest';
import type { AuthenticatedRequest } from '../../iam/iam.types';
import { PermissionInterceptor } from '../../iam/interceptors/permission.interceptor';
import { RoleService } from '../../iam/services/role.service';
import { AnaliseDeCreditoService } from '../services/analise-de-credito.service';
import { DecisaoDeCreditoService } from '../services/decisao-de-credito.service';
import { DocumentosDoCreditoService } from '../services/documentos-do-credito.service';
import { contextoCom, JUSTIFICATIVA, montar } from '../testing/em-memoria';
import { CLIENTE, pedido } from '../testing/fixtures';
import { AnaliseDeCreditoController } from './analise-de-credito.controller';

/** A decisao de credito pela rota HTTP, como a API monta: controller, validacao
 *  do corpo, PermissionInterceptor e RoleService reais. So a autenticacao e
 *  trocada — o cabecalho `x-roles` diz quais roles o usuario tem, no lugar do
 *  token do Firebase e do membership. O ponto e provar que a tela nao e a
 *  unica barreira: chamar a API direto nao passa por cima da permissao. */

@Injectable()
class UsuarioDoCabecalho implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const requisicao = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = String(requisicao.headers['x-roles'] ?? '')
      .split(',')
      .filter(Boolean);
    requisicao.tenant = contextoCom(...roles);
    requisicao.auth = {
      uid: 'analista-1',
      name: 'João Crédito',
    } as unknown as AuthenticatedRequest['auth'];
    return next.handle();
  }
}

const abertos: INestApplication[] = [];

/** Limite de R$ 10.000 com R$ 4.000 em aberto: cabem R$ 6.000. */
const subir = async (pedidos: readonly PedidoDeVenda[]) => {
  const montado = montar(pedidos);
  const modulo = await Test.createTestingModule({
    controllers: [AnaliseDeCreditoController],
    providers: [
      { provide: AnaliseDeCreditoService, useValue: montado.analise },
      { provide: DecisaoDeCreditoService, useValue: montado.decisoes },
      { provide: DocumentosDoCreditoService, useValue: {} },
      { provide: RoleService, useValue: montado.roles },
      // Mesma ordem da API: primeiro o usuario, depois a permissao.
      { provide: APP_INTERCEPTOR, useClass: UsuarioDoCabecalho },
      { provide: APP_INTERCEPTOR, useClass: PermissionInterceptor },
    ],
  }).compile();
  const app = modulo.createNestApplication();
  await app.init();
  abertos.push(app);
  const servidor = app.getHttpServer();
  return {
    ...montado,
    decidir: (roles: string, corpo: object, id = 'pedido-1') =>
      request(servidor)
        .post(`/credit-analysis/orders/${id}/decisao`)
        .set('x-roles', roles)
        .send(corpo),
    liberar: (roles: string, corpo: object) =>
      request(servidor).post('/credit-analysis/orders/liberar').set('x-roles', roles).send(corpo),
    painel: (roles: string) =>
      request(servidor).get(`/credit-analysis/customers/${CLIENTE}`).set('x-roles', roles),
  };
};

afterEach(async () => {
  await Promise.all(abertos.splice(0).map((app) => app.close()));
});

const dentroDaPolitica = () => [pedido({ totalCentavos: 500_000 })];
const foraDaPolitica = () => [pedido({ totalCentavos: 700_000 })];

describe('POST /credit-analysis/orders/:id/decisao', () => {
  it('sem permissao de decidir (VENDEDOR): 403 e o pedido nao muda', async () => {
    const api = await subir(dentroDaPolitica());
    const resposta = await api.decidir('VENDEDOR', { acao: 'APROVAR' });
    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toContain('financeiro.editar');
    expect(api.pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('aprovacao normal dentro da politica (FINANCEIRO): 200', async () => {
    const api = await subir(dentroDaPolitica());
    const resposta = await api.decidir('FINANCEIRO', { acao: 'APROVAR' });
    expect(resposta.status).toBe(200);
    expect(resposta.body.pedido.situacao).toBe('APROVADO');
    expect(api.pedidos.dados.get('pedido-1')?.historico.at(-1)?.tipo).toBe('LIBERADO');
  });

  it('permissao normal tentando excecao: 403, mesmo com justificativa', async () => {
    const api = await subir(foraDaPolitica());
    const resposta = await api.decidir('FINANCEIRO', {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.status).toBe(403);
    expect(resposta.body.message).toContain('Esta operação exige aprovação excepcional');
    expect(api.pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
    expect(api.pedidos.dados.get('pedido-1')?.historico).toEqual([]);
  });

  it('permissao normal tentando "Aprovar" fora da politica: 422', async () => {
    const api = await subir(foraDaPolitica());
    const resposta = await api.decidir('FINANCEIRO', {
      acao: 'APROVAR',
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.status).toBe(422);
    expect(resposta.body.message).toContain('você não possui permissão para essa decisão');
    expect(api.pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('permissao de excecao sem justificativa: 400', async () => {
    const api = await subir(foraDaPolitica());
    const semTexto = await api.decidir('ADMIN_EMPRESA', { acao: 'APROVAR_EXCECAO' });
    expect(semTexto.status).toBe(400);
    const curta = await api.decidir('ADMIN_EMPRESA', {
      acao: 'APROVAR_EXCECAO',
      justificativa: 'ok',
    });
    expect(curta.status).toBe(400);
    expect(api.pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('permissao de excecao com justificativa: 200, auditado', async () => {
    const api = await subir(foraDaPolitica());
    const resposta = await api.decidir('ADMIN_EMPRESA', {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.status).toBe(200);
    expect(resposta.body.avaliacao.violaPolitica).toBe(true);
    expect(api.pedidos.dados.get('pedido-1')?.historico.at(-1)).toMatchObject({
      tipo: 'LIBERADO_EXCECAO',
      justificativa: JUSTIFICATIVA,
      motivosForaDaPolitica: ['LIMITE_INSUFICIENTE'],
    });
  });

  it('cargo personalizado com a permissao aprova excecao; o mesmo cargo sem ela, nao', async () => {
    const api = await subir(foraDaPolitica());
    const admin = contextoCom('ADMIN_EMPRESA');
    const semExcecao = api.roles.create(admin, {
      name: 'Analista de crédito',
      permissions: [{ permission: 'financeiro.visualizar' }, { permission: 'financeiro.editar' }],
    });
    const comExcecao = api.roles.create(admin, {
      name: 'Gerente de crédito',
      permissions: [
        { permission: 'financeiro.visualizar' },
        { permission: 'financeiro.editar' },
        { permission: 'financeiro.credito.aprovarExcecao' },
      ],
    });
    const corpo = { acao: 'APROVAR_EXCECAO', justificativa: JUSTIFICATIVA };
    expect((await api.decidir(semExcecao.id, corpo)).status).toBe(403);
    expect((await api.decidir(comExcecao.id, corpo)).status).toBe(200);
  });

  it('a excecao sozinha nao abre a rota: sem financeiro.editar, 403', async () => {
    const api = await subir(foraDaPolitica());
    const soExcecao = api.roles.create(contextoCom('ADMIN_EMPRESA'), {
      name: 'Só exceção',
      permissions: [{ permission: 'financeiro.credito.aprovarExcecao' }],
    });
    const resposta = await api.decidir(soExcecao.id, {
      acao: 'APROVAR_EXCECAO',
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.status).toBe(403);
  });
});

describe('tentativas de contornar pela API', () => {
  it('campo extra no corpo nao transforma aprovacao normal em excecao', async () => {
    const api = await subir(foraDaPolitica());
    const resposta = await api.decidir('FINANCEIRO', {
      acao: 'APROVAR',
      excepcional: true,
      violaPolitica: false,
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.status).toBe(422);
    expect(api.pedidos.dados.get('pedido-1')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('acao desconhecida e recusada na validacao', async () => {
    const api = await subir(foraDaPolitica());
    const resposta = await api.decidir('FINANCEIRO', { acao: 'APROVAR_SEM_CHECAR' });
    expect(resposta.status).toBe(400);
  });

  it('lote com justificativa nao libera o fora da politica para quem nao tem a permissao', async () => {
    const api = await subir([
      pedido({ id: 'a', numero: 1, totalCentavos: 400_000, enviadoEm: '2026-09-12T10:00:00Z' }),
      pedido({ id: 'b', numero: 2, totalCentavos: 400_000, enviadoEm: '2026-09-13T10:00:00Z' }),
    ]);
    const resposta = await api.liberar('FINANCEIRO', {
      ids: ['a', 'b'],
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.status).toBe(201);
    expect(resposta.body.liberados).toEqual(['a']);
    expect(resposta.body.excepcionais).toEqual([]);
    expect(resposta.body.recusados[0].motivo).toContain('exige aprovação excepcional');
    expect(api.pedidos.dados.get('b')?.situacao).toBe('AGUARDANDO_ANALISE');
  });

  it('o mesmo lote, com a permissao, libera o excedente como excepcional', async () => {
    const api = await subir([
      pedido({ id: 'a', numero: 1, totalCentavos: 400_000, enviadoEm: '2026-09-12T10:00:00Z' }),
      pedido({ id: 'b', numero: 2, totalCentavos: 400_000, enviadoEm: '2026-09-13T10:00:00Z' }),
    ]);
    const resposta = await api.liberar('ADMIN_EMPRESA', {
      ids: ['a', 'b'],
      justificativa: JUSTIFICATIVA,
    });
    expect(resposta.body.excepcionais).toEqual(['b']);
  });
});

describe('GET /credit-analysis/customers/:id — o que o usuario pode decidir', () => {
  it.each([
    ['ADMIN_EMPRESA', { decidir: true, aprovarExcecao: true }],
    ['FINANCEIRO', { decidir: true, aprovarExcecao: false }],
    ['GERENTE', { decidir: false, aprovarExcecao: false }],
  ])('%s', async (roles, permissoes) => {
    const api = await subir(dentroDaPolitica());
    const resposta = await api.painel(roles);
    expect(resposta.status).toBe(200);
    expect(resposta.body.permissoes).toEqual(permissoes);
  });
});
