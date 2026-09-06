# Performance em volume

## Alvo e massa

`pnpm performance:seed:dry-run` valida, sem gravar, o plano padrão de 100 mil produtos, 500 mil clientes, 1 milhão de movimentos e 1 milhão de vendas. A gravação exige emulador Firestore ou `PERF_TARGET=staging` e confirmação exata `<projeto>:<total>` em `PERF_SEED_CONFIRM`. Produção não é aceita como alvo.

## Consultas

Listagens de alto crescimento usam `limit`, cursor opaco/estável e resposta `{ items, nextCursor, hasMore }`. Produtos, clientes, fornecedores, histórico de cliente, auditoria, DF-e, entregas, alertas de validade e notificações não retornam a coleção inteira. Listas de configuração de baixa cardinalidade, como cargos e filiais de um tenant, permanecem limitadas pelo domínio.

Os índices versionados em `firestore.indexes.json` cobrem auditoria por usuário/entidade e FEFO por filial, depósito, produto e validade. Toda consulta nova precisa ser exercitada no Emulator Suite antes de incluir o índice sugerido pelo Firestore.

Use `pnpm performance:indexes:verify` para subir um Firestore Emulator descartável, gravar dados sintéticos e executar as três consultas compostas versionadas.

## Cache, jobs e agregações

`CacheService` usa Redis nas consultas quentes e fallback local apenas para desenvolvimento. `HeavyJobQueue` envia recomputação de agregados, exportações e reindexação ao BullMQ, com retentativas e backoff. `MaterializedAggregateService` manté contadores incrementais e enfileira recomputação; dashboards consultam o valor materializado, nunca varrem vendas ou movimentos.

## Teste de carga e orçamentos

Instale k6 e execute contra staging:

```powershell
$env:API_URL='https://staging.example/api/v1'
$env:AUTH_TOKEN='<token-sintetico>'
$env:DEVICE_SESSION='<sessao-sintetica>'
pnpm performance:load
```

O cenário sustenta 100 usuários simultâneos por três minutos. Os limites versionados estão em `performance/latency-budgets.json`; a carga falha acima de 2% de erro, p95 de 250 ms no health ou 500 ms na listagem de produtos. Resultados reais devem registrar commit, ambiente, tamanho da massa, região, p50/p95/p99, throughput e erros.
