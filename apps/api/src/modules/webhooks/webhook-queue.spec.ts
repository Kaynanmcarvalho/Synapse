import { WebhookInbox } from './webhook-inbox';
import { esperaDaTentativa, FilaEmMemoria, RETENTATIVA_PADRAO } from './webhook-queue';

describe('esperaDaTentativa', () => {
  // Banco fora do ar volta em minutos: repetir de imediato so multiplica a
  // carga em cima de quem ja esta em apuros.
  it('cresce exponencialmente', () => {
    expect(esperaDaTentativa(1, RETENTATIVA_PADRAO)).toBe(1_000);
    expect(esperaDaTentativa(2, RETENTATIVA_PADRAO)).toBe(2_000);
    expect(esperaDaTentativa(3, RETENTATIVA_PADRAO)).toBe(4_000);
    expect(esperaDaTentativa(4, RETENTATIVA_PADRAO)).toBe(8_000);
  });
});

// c26-4: retry com backoff no processamento.
describe('FilaEmMemoria', () => {
  let inbox: WebhookInbox;
  let esperas: number[];

  const novaFila = (politica = RETENTATIVA_PADRAO) => {
    esperas = [];
    return new FilaEmMemoria(inbox, politica, (ms) => {
      esperas.push(ms);
      return Promise.resolve();
    });
  };

  const registrar = () =>
    inbox.registrar('sicredi', '{"a":1}', {}, 'sicredi:evt-1', 'RECEBIDO').evento;

  beforeEach(() => {
    inbox = new WebhookInbox();
  });

  it('marca como processado quando dá certo de primeira', async () => {
    const evento = registrar();
    const fila = novaFila();
    fila.registrarProcessador(() => Promise.resolve());

    await fila.trabalhar({ eventoId: evento.id });

    expect(inbox.buscar(evento.id)?.situacao).toBe('PROCESSADO');
    expect(inbox.buscar(evento.id)?.tentativas).toBe(1);
    expect(esperas).toEqual([]);
  });

  it('repete com backoff ate conseguir', async () => {
    const evento = registrar();
    const fila = novaFila();
    let chamadas = 0;
    fila.registrarProcessador(() => {
      chamadas += 1;
      return chamadas < 3 ? Promise.reject(new Error('banco fora do ar')) : Promise.resolve();
    });

    await fila.trabalhar({ eventoId: evento.id });

    expect(chamadas).toBe(3);
    expect(esperas).toEqual([1_000, 2_000]);
    expect(inbox.buscar(evento.id)?.situacao).toBe('PROCESSADO');
    expect(inbox.buscar(evento.id)?.tentativas).toBe(3);
  });

  it('desiste depois do maximo e guarda o ultimo erro', async () => {
    const evento = registrar();
    const fila = novaFila({ maximoDeTentativas: 3, esperaInicialMs: 10, fator: 2 });
    fila.registrarProcessador(() => Promise.reject(new Error('502 do provedor')));

    await fila.trabalhar({ eventoId: evento.id });

    const guardado = inbox.buscar(evento.id);
    expect(guardado?.situacao).toBe('FALHOU');
    expect(guardado?.tentativas).toBe(3);
    expect(guardado?.ultimoErro).toBe('502 do provedor');
    expect(esperas).toEqual([10, 20]);
  });

  it('enfileirar devolve na hora, sem esperar o processamento', async () => {
    const evento = registrar();
    const fila = novaFila();
    let processou = false;
    fila.registrarProcessador(() => {
      processou = true;
      return Promise.resolve();
    });

    await fila.enfileirar({ eventoId: evento.id });

    // O trabalho foi agendado, e nao executado dentro da chamada.
    expect(processou).toBe(false);
    await new Promise((resolve) => setImmediate(resolve));
    expect(processou).toBe(true);
  });
});

describe('WebhookInbox', () => {
  // c26-3: registro de todo evento recebido, valido ou nao.
  it('guarda tambem o que foi recusado', () => {
    const inbox = new WebhookInbox();
    inbox.registrar('itau', '{}', {}, 'itau:1', 'ASSINATURA_INVALIDA');
    inbox.registrar('itau', '{}', {}, 'itau:2', 'RECEBIDO');

    expect(inbox.todos()).toHaveLength(2);
    expect(inbox.porSituacao('ASSINATURA_INVALIDA')).toHaveLength(1);
  });

  it('duas recusas com a mesma chave nao viram duplicata uma da outra', () => {
    const inbox = new WebhookInbox();
    const a = inbox.registrar('itau', '{}', {}, 'itau:1', 'ASSINATURA_INVALIDA');
    const b = inbox.registrar('itau', '{}', {}, 'itau:1', 'ASSINATURA_INVALIDA');

    expect(a.duplicado).toBe(false);
    expect(b.duplicado).toBe(false);
    expect(inbox.porSituacao('ASSINATURA_INVALIDA')).toHaveLength(2);
  });
});
