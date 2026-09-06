import { Injectable, Logger } from '@nestjs/common';
import { WebhookInbox } from './webhook-inbox';

export interface TarefaDeWebhook {
  readonly eventoId: string;
}

export type Processador = (tarefa: TarefaDeWebhook) => Promise<void>;

export interface PoliticaDeRetentativa {
  readonly maximoDeTentativas: number;
  readonly esperaInicialMs: number;
  readonly fator: number;
}

export const RETENTATIVA_PADRAO: PoliticaDeRetentativa = {
  maximoDeTentativas: 5,
  esperaInicialMs: 1_000,
  fator: 2,
};

/** Backoff exponencial: 1s, 2s, 4s, 8s... (c26-4).
 *
 *  Banco fora do ar volta em minutos, nao em milissegundos — repetir de imediato
 *  so multiplica a carga em cima de quem ja esta em apuros. */
export const esperaDaTentativa = (tentativa: number, politica: PoliticaDeRetentativa): number =>
  politica.esperaInicialMs * politica.fator ** (tentativa - 1);

/** Fila de webhooks.
 *
 *  A interface existe para o endpoint nao processar na request (c26-5): ele
 *  registra, enfileira e responde. O §47 pede BullMQ, que e a implementacao de
 *  producao — mas BullMQ exige Redis, e este repositorio ainda nao tem Redis em
 *  lugar nenhum. Colocar a dependencia agora quebraria o dev e o CI de todo
 *  mundo por uma infra que ninguem provisionou.
 *
 *  Entao: a fila em memoria abaixo ja tira o processamento da request e ja faz
 *  retentativa com backoff. Trocar por BullMQ e implementar esta mesma interface
 *  — o resto do modulo nao muda. */
export abstract class FilaDeWebhooks {
  abstract enfileirar(tarefa: TarefaDeWebhook): Promise<void>;
  abstract registrarProcessador(processador: Processador): void;
}

@Injectable()
export class FilaEmMemoria extends FilaDeWebhooks {
  private readonly logger = new Logger(FilaEmMemoria.name);
  private processador: Processador | null = null;

  constructor(
    private readonly inbox: WebhookInbox,
    private readonly politica: PoliticaDeRetentativa = RETENTATIVA_PADRAO,
    /** Injetavel para o teste nao esperar de verdade. */
    private readonly dormir: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    super();
  }

  registrarProcessador(processador: Processador): void {
    this.processador = processador;
  }

  /** Devolve na hora: o trabalho segue fora da request. */
  enfileirar(tarefa: TarefaDeWebhook): Promise<void> {
    setImmediate(() => void this.trabalhar(tarefa));
    return Promise.resolve();
  }

  /** Exposto para o teste conseguir esperar o fim do processamento. */
  async trabalhar(tarefa: TarefaDeWebhook): Promise<void> {
    if (!this.processador) {
      this.logger.error('Nenhum processador registrado para a fila de webhooks');
      return;
    }

    for (let tentativa = 1; tentativa <= this.politica.maximoDeTentativas; tentativa += 1) {
      try {
        await this.processador(tarefa);
        this.inbox.marcar(tarefa.eventoId, 'PROCESSADO', null, tentativa);
        return;
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        const ultima = tentativa === this.politica.maximoDeTentativas;
        this.inbox.marcar(tarefa.eventoId, ultima ? 'FALHOU' : 'RECEBIDO', mensagem, tentativa);

        if (ultima) {
          this.logger.error(
            `Webhook ${tarefa.eventoId} falhou em ${tentativa} tentativas: ${mensagem}`,
          );
          return;
        }
        await this.dormir(esperaDaTentativa(tentativa, this.politica));
      }
    }
  }
}
