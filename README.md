# Synapse

ERP SaaS multi-tenant para distribuidoras de racao, agropecuarias e lojas pet.
Matriz e filiais, vendedores externos, PDV, fiscal (NF-e, NFC-e, DF-e, MDF-e) e integracao bancaria.

> Fase atual: **F0 — fundacao**. O monorepo compila, roda e passa no CI; as regras de negocio
> chegam a partir da Fase 1.

## Estrutura

```
apps/
  api                 API NestJS (TypeScript strict)
  web-erp             retaguarda    · React + Vite + Tailwind · :5173
  web-admin           console SaaS  · React + Vite + Tailwind · :5174
  web-vendedor        portal do vendedor externo             · :5175
  android-vendedor    reservado para o app nativo (F7)
packages/
  config              tsconfig, eslint e presets compartilhados
  types               contratos e tipos do dominio
  validation          schemas Zod e regras (CPF/CNPJ, paginacao)
  firebase            Firebase Admin (servidor) e Web (cliente)
  ui                  componentes React + preset Tailwind
docs/                 arquitetura, ADRs e convencoes
```

## Comecando

```bash
pnpm install          # Node >= 20.11, pnpm >= 10
cp .env.example .env  # preencha as chaves
pnpm dev              # sobe api e apps web em paralelo
```

| Script           | O que faz                                   |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | tudo em modo watch                          |
| `pnpm build`     | build de todos os pacotes, na ordem correta |
| `pnpm lint`      | ESLint em todo o monorepo                   |
| `pnpm typecheck` | `tsc --noEmit` em todo o monorepo           |
| `pnpm test`      | testes de todos os pacotes                  |
| `pnpm format`    | Prettier em tudo                            |
| `pnpm check`     | lint + typecheck + build, o que o CI roda   |

Para rodar um workspace so: `pnpm --filter @synapse/api dev`.

## Convencoes

Estao em [docs/convencoes.md](docs/convencoes.md). Em resumo: TypeScript strict em todo lugar,
um arquivo por responsabilidade e nada de acesso a dados fora dos repositories.

## Quadro de tarefas

O planejamento vive no Muvta. O servidor MCP e configurado em `.mcp.json` e le a chave
de `MUVTA_API_KEY` — a chave nao entra no repositorio.

## Licenca

MIT — veja [LICENSE](LICENSE).
