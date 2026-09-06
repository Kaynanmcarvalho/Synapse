# ADR-0006 — Sincronização offline por operações

- Status: Proposto
- Data: 2026-09-05

## Contexto

O vendedor precisa criar pedidos sem sinal. Cache local pode estar desatualizado e nunca deve decidir estoque, preço final ou limite de crédito.

## Opções

1. Replicar documentos com last-write-wins.
2. Bloquear criação sem conexão.
3. Fila local de operações idempotentes com validação do servidor.

## Decisão

Adotar a opção 3. Room armazena dados autorizados, cursor e versões. Cada pedido recebe `clientOrderId` UUID estável e snapshot local. WorkManager reenvia a mesma operação até obter decisão persistida do servidor. O backend deduplica, revalida regras e responde `ACCEPTED`, `CONFLICT` ou `REJECTED` com diferenças estruturadas.

## Consequências

O vendedor trabalha offline sem duplicar pedidos. Pode haver conflito após reconexão, exigindo UX de revisão. Operações críticas não são mescladas automaticamente. Revogação de acesso limita novos syncs; política de expiração e criptografia do cache deve ser definida na implementação móvel.
