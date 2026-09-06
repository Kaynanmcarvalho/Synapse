# ADR-0003 — Isolamento multi-tenant em banco compartilhado

- Status: Proposto
- Data: 2026-09-05

## Contexto

O SaaS precisa impedir vazamento entre empresas sem multiplicar infraestrutura por cliente no início. O `tenantId` enviado pelo navegador não é confiável.

## Opções

1. Banco/projeto dedicado por tenant.
2. Bancos compartilhados com isolamento apenas na aplicação.
3. Bancos compartilhados com defesa em profundidade.

## Decisão

Adotar a opção 3. O backend deriva `tenantId` do token e vínculo ativo. Firestore usa `tenants/{tenantId}/...` e Security Rules. PostgreSQL usa `tenant_id`, chaves/índices adequados e RLS. Repositórios exigem `TenantContext`; escopos de filial e depósito são validados pelo RBAC. Storage usa prefixo por tenant e URLs temporárias.

## Consequências

O custo inicial é menor e a operação é centralizada. Toda consulta, índice, cache, evento, job e log deve carregar tenant. Testes automatizados cross-tenant e revisão de migrations/regras são gates de segurança. Tenant dedicado permanece opção futura para requisitos regulatórios ou escala excepcional.
