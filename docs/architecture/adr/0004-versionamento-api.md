# ADR-0004 — Versionamento e compatibilidade da API

- Status: Proposto
- Data: 2026-09-05

## Contexto

Web e Android evoluem em ritmos diferentes; vendedores podem permanecer offline e voltar com versões antigas. Mudanças incompatíveis não podem interromper pedidos ou PDV.

## Opções

1. API sem versão explícita.
2. Versão em header.
3. Versão major no caminho e evolução aditiva dentro da major.

## Decisão

Adotar `/api/v1`. Dentro de `v1`, adicionar campos opcionais e novos endpoints sem alterar semântica existente. Mudança incompatível cria `v2`. Respostas incluem schema/version quando participam de sincronização. Escritas idempotentes aceitam `Idempotency-Key`; concorrência usa `version`/ETag onde aplicável.

Versões antigas têm telemetria, janela de suporte publicada e aviso de descontinuação antes do bloqueio. O servidor tolera campos desconhecidos apenas quando o contrato daquele endpoint declarar evolução aberta; entradas financeiras/fiscais permanecem estritas.

## Consequências

Há duplicação temporária entre majors e necessidade de testes de contrato por cliente suportado. Em troca, deploys ficam desacoplados e o aplicativo offline consegue sincronizar com segurança.
