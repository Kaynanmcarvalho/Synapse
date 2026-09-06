# ADR-0008 — Agregado transacional de estoque por depósito

- Status: Proposto
- Data: 2026-09-05

## Contexto

Pedidos concorrentes podem disputar a última unidade. Um campo de saldo no produto não representa múltiplos depósitos, reserva, bloqueio ou histórico.

## Opções

1. Saldo simples no produto.
2. Somar movimentos a cada leitura.
3. Agregado de saldo por tenant/filial/depósito/produto, atualizado em transação e acompanhado de ledger imutável.

## Decisão

Adotar a opção 3 no Firestore. O documento `tenants/{tenantId}/inventory/{branchId}_{warehouseId}_{productId}` guarda `physical`, `reserved`, `blocked`, `available` e versão. Reserva, baixa, liberação e movimento append-only são gravados na mesma transação. O comando contém chave idempotente e valida invariantes contra a versão lida.

## Consequências

Leitura de saldo é rápida e concorrência não causa sobrevenda silenciosa. Transações sob forte contenção podem exigir retry e particionamento futuro. O ledger permite reconstrução e reconciliação; um job compara saldo materializado com movimentos e alerta divergências, sem corrigir automaticamente sem trilha de auditoria.
