import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { WebhookInbox, chaveDeIdempotencia } from './webhook-inbox';
import { FilaDeWebhooks, type TarefaDeWebhook, type Processador } from './webhook-queue';
import { assinaturaConfere, SegredosDeWebhook } from './webhook-signature';
import { WebhooksService } from './webhooks.service';

const SEGREDO = 'segredo-do-sicredi';

const assinar = (corpo: string): string =>
  createHmac('sha256', SEGREDO).update(corpo, 'utf8').digest('hex');

const corpoDe = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ eventId: 'evt-1', tipo: 'BOLETO_LIQUIDADO', referencia: 'REC-1', ...extra });

/** Fila que so anota o que foi enfileirado: o teste do servico nao precisa do
 *  processamento, precisa saber se o trabalho saiu da request. */
class FilaEspia extends FilaDeWebhooks {
  readonly enfileiradas: TarefaDeWebhook[] = [];
  enfileirar(tarefa: TarefaDeWebhook): Promise<void> {
    this.enfileiradas.push(tarefa);
    return Promise.resolve();
  }
  registrarProcessador(_processador: Processador): void {}
}

describe('WebhooksService', () => {
  let inbox: WebhookInbox;
  let fila: FilaEspia;
  let service: WebhooksService;

  const headers = (corpo: string, assinatura = assinar(corpo)) => ({
    'x-sicredi-signature': assinatura,
  });

  beforeEach(() => {
    inbox = new WebhookInbox();
    fila = new FilaEspia();
    const segredos = new SegredosDeWebhook();
    segredos.definir('sicredi', SEGREDO);
    service = new WebhooksService(inbox, fila, segredos);
  });

  it('aceita o evento assinado e tira o processamento da request', async () => {
    const corpo = corpoDe();
    const resposta = await service.receber('sicredi', corpo, headers(corpo));

    expect(resposta).toMatchObject({ recebido: true, duplicado: false });
    expect(fila.enfileiradas).toHaveLength(1);
    expect(fila.enfileiradas[0]?.eventoId).toBe(resposta.eventoId);
  });

  // c26-6: o mesmo evento duas vezes gera um efeito so (§62).
  describe('idempotencia', () => {
    it('nao enfileira o mesmo evento duas vezes', async () => {
      const corpo = corpoDe();
      const primeira = await service.receber('sicredi', corpo, headers(corpo));
      const segunda = await service.receber('sicredi', corpo, headers(corpo));

      expect(fila.enfileiradas).toHaveLength(1);
      expect(segunda.duplicado).toBe(true);
      // A repetida aponta para o evento original, e nao para um novo.
      expect(segunda.eventoId).toBe(primeira.eventoId);
    });

    it('responde 200 na repetida, para o banco parar de insistir', async () => {
      const corpo = corpoDe();
      await service.receber('sicredi', corpo, headers(corpo));

      await expect(service.receber('sicredi', corpo, headers(corpo))).resolves.toMatchObject({
        recebido: true,
      });
    });

    it('registra a repetida no historico, sem reprocessar', async () => {
      const corpo = corpoDe();
      await service.receber('sicredi', corpo, headers(corpo));
      await service.receber('sicredi', corpo, headers(corpo));

      expect(inbox.porSituacao('DUPLICADO')).toHaveLength(1);
      expect(inbox.porSituacao('RECEBIDO')).toHaveLength(1);
    });

    it('trata eventos diferentes como diferentes', async () => {
      const a = corpoDe({ eventId: 'evt-1' });
      const b = corpoDe({ eventId: 'evt-2' });
      await service.receber('sicredi', a, headers(a));
      await service.receber('sicredi', b, headers(b));

      expect(fila.enfileiradas).toHaveLength(2);
    });

    // Sem id do provedor, o corpo cru identifica: a reentrega e byte a byte igual.
    it('cai no hash do corpo quando o provedor nao manda id', async () => {
      const corpo = JSON.stringify({ tipo: 'PIX_CONCLUIDO', referencia: 'REC-9' });
      const primeira = await service.receber('sicredi', corpo, headers(corpo));
      const segunda = await service.receber('sicredi', corpo, headers(corpo));

      expect(segunda.duplicado).toBe(true);
      expect(segunda.eventoId).toBe(primeira.eventoId);
      expect(fila.enfileiradas).toHaveLength(1);
    });
  });

  // c26-7: assinatura invalida devolve 401 e loga.
  describe('assinatura', () => {
    it('recusa assinatura errada com 401', async () => {
      const corpo = corpoDe();
      await expect(
        service.receber('sicredi', corpo, headers(corpo, 'a'.repeat(64))),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('recusa quando nao vem assinatura nenhuma', async () => {
      await expect(service.receber('sicredi', corpoDe(), {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('recusa corpo adulterado depois de assinado', async () => {
      const original = corpoDe();
      const adulterado = corpoDe({ referencia: 'REC-DO-ATACANTE' });

      await expect(service.receber('sicredi', adulterado, headers(original))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('registra a tentativa recusada, que e o que revela alguem sondando', async () => {
      const corpo = corpoDe();
      await expect(
        service.receber('sicredi', corpo, headers(corpo, 'b'.repeat(64))),
      ).rejects.toThrow();

      const recusados = inbox.porSituacao('ASSINATURA_INVALIDA');
      expect(recusados).toHaveLength(1);
      expect(recusados[0]?.corpoCru).toBe(corpo);
    });

    it('nao enfileira nada quando a assinatura falha', async () => {
      const corpo = corpoDe();
      await expect(
        service.receber('sicredi', corpo, headers(corpo, 'c'.repeat(64))),
      ).rejects.toThrow();
      expect(fila.enfileiradas).toHaveLength(0);
    });

    // Se a tentativa recusada ocupasse a chave, bastaria mandar lixo antes do
    // provedor para bloquear o evento de verdade.
    it('tentativa recusada nao bloqueia o evento legitimo que chega depois', async () => {
      const corpo = corpoDe();
      await expect(
        service.receber('sicredi', corpo, headers(corpo, 'd'.repeat(64))),
      ).rejects.toThrow();

      const legitimo = await service.receber('sicredi', corpo, headers(corpo));

      expect(legitimo.duplicado).toBe(false);
      expect(fila.enfileiradas).toHaveLength(1);
    });

    it('recusa quando nao ha segredo cadastrado para o provedor', async () => {
      const corpo = corpoDe();
      await expect(
        service.receber('itau', corpo, { 'x-itau-signature': assinar(corpo) }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

describe('assinaturaConfere', () => {
  it('aceita a assinatura correta, com ou sem o prefixo sha256=', () => {
    const corpo = '{"a":1}';
    const digest = createHmac('sha256', SEGREDO).update(corpo).digest('hex');

    expect(assinaturaConfere(corpo, digest, SEGREDO)).toBe(true);
    expect(assinaturaConfere(corpo, `sha256=${digest}`, SEGREDO)).toBe(true);
  });

  it('recusa assinatura vazia, segredo vazio e tamanho diferente', () => {
    expect(assinaturaConfere('{}', null, SEGREDO)).toBe(false);
    expect(assinaturaConfere('{}', 'abcd', '')).toBe(false);
    expect(assinaturaConfere('{}', 'abcd', SEGREDO)).toBe(false);
  });

  it('recusa hex invalido sem explodir', () => {
    expect(assinaturaConfere('{}', 'nao-e-hex', SEGREDO)).toBe(false);
  });
});

describe('chaveDeIdempotencia', () => {
  it('prefere o id do provedor, que e estavel entre reentregas', () => {
    expect(chaveDeIdempotencia('sicredi', '{"a":1}', 'evt-9')).toBe('sicredi:evt-9');
  });

  it('separa provedores com o mesmo id de evento', () => {
    expect(chaveDeIdempotencia('sicredi', '{}', 'evt-1')).not.toBe(
      chaveDeIdempotencia('itau', '{}', 'evt-1'),
    );
  });

  it('sem id, usa o hash do corpo', () => {
    const chave = chaveDeIdempotencia('fiscal', '{"a":1}', null);
    expect(chave).toMatch(/^fiscal:sha256:[0-9a-f]{64}$/);
    expect(chaveDeIdempotencia('fiscal', '{"a":1}', null)).toBe(chave);
    expect(chaveDeIdempotencia('fiscal', '{"a":2}', null)).not.toBe(chave);
  });
});
