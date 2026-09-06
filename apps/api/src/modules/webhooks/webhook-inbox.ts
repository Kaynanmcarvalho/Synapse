import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { WebhookProvider } from './webhook-signature';

export type SituacaoDoEvento =
  'RECEBIDO' | 'PROCESSADO' | 'FALHOU' | 'DUPLICADO' | 'ASSINATURA_INVALIDA';

export interface EventoRecebido {
  readonly id: string;
  readonly provedor: WebhookProvider;
  readonly chaveDeIdempotencia: string;
  readonly situacao: SituacaoDoEvento;
  readonly corpoCru: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly recebidoEm: string;
  readonly tentativas: number;
  readonly ultimoErro: string | null;
}

/** Chave de idempotencia (c26-2).
 *
 *  O id que o provedor manda e a melhor chave — e estavel entre reentregas. Sem
 *  ele, o hash do corpo cru serve: a mesma notificacao reenviada tem o mesmo
 *  corpo, byte a byte. O hash e o ultimo recurso, e nao o padrao, porque dois
 *  eventos legitimamente identicos (mesmo valor, mesmo segundo) colidiriam. */
export const chaveDeIdempotencia = (
  provedor: WebhookProvider,
  corpoCru: string,
  idDoProvedor: string | null,
): string => {
  if (idDoProvedor) return `${provedor}:${idDoProvedor}`;
  return `${provedor}:sha256:${createHash('sha256').update(corpoCru, 'utf8').digest('hex')}`;
};

export interface ResultadoDoRegistro {
  readonly evento: EventoRecebido;
  /** true quando esta chave ja tinha sido registrada antes. */
  readonly duplicado: boolean;
}

/** Guarda **todo** evento que chega, valido ou nao (c26-3).
 *
 *  Inclusive o de assinatura invalida: e o registro dessas tentativas que mostra
 *  alguem sondando a porta mais exposta do sistema. */
@Injectable()
export class WebhookInbox {
  private readonly eventos = new Map<string, EventoRecebido>();
  private readonly porChave = new Map<string, string>();

  registrar(
    provedor: WebhookProvider,
    corpoCru: string,
    headers: Readonly<Record<string, string>>,
    chave: string,
    situacao: SituacaoDoEvento,
  ): ResultadoDoRegistro {
    const jaVisto = this.porChave.get(chave);

    // Assinatura invalida nunca ocupa a chave: senao bastaria mandar lixo com a
    // chave certa antes do provedor para bloquear o evento de verdade.
    if (situacao === 'ASSINATURA_INVALIDA') {
      const evento = this.novo(provedor, corpoCru, headers, chave, situacao);
      this.eventos.set(evento.id, evento);
      return { evento, duplicado: false };
    }

    if (jaVisto) {
      const original = this.eventos.get(jaVisto);
      if (original) {
        const duplicado = this.novo(provedor, corpoCru, headers, chave, 'DUPLICADO');
        this.eventos.set(duplicado.id, duplicado);
        return { evento: original, duplicado: true };
      }
    }

    const evento = this.novo(provedor, corpoCru, headers, chave, situacao);
    this.eventos.set(evento.id, evento);
    this.porChave.set(chave, evento.id);
    return { evento, duplicado: false };
  }

  private novo(
    provedor: WebhookProvider,
    corpoCru: string,
    headers: Readonly<Record<string, string>>,
    chaveDaIdempotencia: string,
    situacao: SituacaoDoEvento,
  ): EventoRecebido {
    return {
      id: randomUUID(),
      provedor,
      chaveDeIdempotencia: chaveDaIdempotencia,
      situacao,
      corpoCru,
      headers,
      recebidoEm: new Date().toISOString(),
      tentativas: 0,
      ultimoErro: null,
    };
  }

  marcar(id: string, situacao: SituacaoDoEvento, erro: string | null, tentativas: number): void {
    const evento = this.eventos.get(id);
    if (!evento) return;
    this.eventos.set(id, { ...evento, situacao, ultimoErro: erro, tentativas });
  }

  buscar(id: string): EventoRecebido | undefined {
    return this.eventos.get(id);
  }

  todos(): readonly EventoRecebido[] {
    return [...this.eventos.values()];
  }

  porSituacao(situacao: SituacaoDoEvento): readonly EventoRecebido[] {
    return this.todos().filter((evento) => evento.situacao === situacao);
  }
}
