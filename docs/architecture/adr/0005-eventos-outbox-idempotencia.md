# ADR-0005 — Outbox, filas e idempotência

- Status: Proposto
- Data: 2026-09-05

## Contexto

Firestore, PostgreSQL, bancos e fiscal não compartilham transação. Retries, webhooks duplicados e falhas parciais são inevitáveis.

## Opções

1. Chamadas síncronas e melhor esforço.
2. Transação distribuída.
3. Outbox transacional, fila, consumidores idempotentes e sagas.

## Decisão

Adotar a opção 3. A alteração de domínio e sua outbox são gravadas na mesma transação da fonte de verdade. BullMQ/Redis agenda o processamento. Cada mensagem possui `eventId`, tenant, aggregateId, versão, correlationId e timestamp. Consumidores registram `eventId` antes/ao aplicar o efeito. Processos de várias etapas usam saga com estado persistido e compensações explícitas.

## Consequências

A consistência entre módulos é eventual e visível por estados intermediários. São obrigatórios retry com backoff/jitter, dead-letter, replay seguro, monitoramento de lag e reconciliação. A complexidade é aceita para evitar perda e duplicação de efeitos.
