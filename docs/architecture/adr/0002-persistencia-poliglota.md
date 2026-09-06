# ADR-0002 — Firestore e PostgreSQL por responsabilidade

- Status: Proposto
- Data: 2026-09-05

## Contexto

O aplicativo móvel precisa de sincronização e o núcleo operacional pede atualizações em tempo real. Fiscal, financeiro, conciliação, auditoria e relatórios dependem de relações, restrições e consultas consistentes. Um único banco força compromissos inadequados.

## Opções

1. Somente Firestore.
2. Somente PostgreSQL.
3. Persistência poliglota com fonte de verdade definida por agregado.

## Decisão

Adotar a opção 3. Firestore é a fonte operacional de tenant/configuração, catálogo, clientes, preços operacionais, pedidos, saldo e movimentos de estoque. PostgreSQL é a fonte de verdade de fiscal, financeiro, conciliação e auditoria consultável. Relatórios usam projeções no PostgreSQL/Redis; arquivos ficam em Object Storage.

Cada agregado tem exatamente uma fonte de verdade. Eventos de outbox replicam fatos entre bancos; não há escrita dupla síncrona nem transação distribuída.

O catálogo completo de entidades, campos, relacionamentos, índices e regras está em [DATABASE.md](../../DATABASE.md).

## Consequências

Atende acesso operacional e integridade relacional, mas aumenta operação, custo e necessidade de reconciliação. Projeções podem atrasar; interfaces devem mostrar estados `PROCESSING` quando necessário. Métricas de lag, reprocessamento idempotente e jobs de reconciliação tornam-se obrigatórios.
