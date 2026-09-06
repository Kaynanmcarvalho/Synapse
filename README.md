# Synapse

ERP SaaS multi-tenant para distribuidoras de racao, agropecuarias e lojas pet.
Matriz e filiais, vendedores externos, PDV, fiscal (NF-e, NFC-e, DF-e, MDF-e) e integracao bancaria.

> Implementação em evolução pelas fases do roadmap. Consulte os cartões em revisão no Muvta e a documentação de cada domínio antes de ativar integrações reais.

## Estrutura

```
apps/
  api                 API NestJS (TypeScript strict)
  web-erp             retaguarda    · React + Vite + Tailwind · :5173
  web-admin           console SaaS  · React + Vite + Tailwind · :5174
  web-vendedor        portal do vendedor externo             · :5175
  android-vendedor    app Kotlin/Compose offline-first do vendedor
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

A API usa o prefixo versionado `/api/v1`. Com a API ativa, a interface OpenAPI fica em <http://localhost:3333/api/v1/docs> e o documento JSON em <http://localhost:3333/api/v1/openapi.json>.

## Documentação

- [Arquitetura e ADRs](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Fiscal](docs/FISCAL.md)
- [Bancos](docs/BANKING.md)
- [Segurança](docs/SECURITY.md) e [permissões](docs/PERMISSIONS.md)
- [Deployment](docs/DEPLOYMENT.md) e [sincronização offline](docs/OFFLINE_SYNC.md)
- [Dependências de documentação oficial](docs/OFFICIAL_DOCS_PENDING.md)

## Convencoes

Estao em [docs/convencoes.md](docs/convencoes.md). Em resumo: TypeScript strict em todo lugar,
um arquivo por responsabilidade e nada de acesso a dados fora dos repositories.

## Quadro de tarefas

O planejamento vive no Muvta. O servidor MCP e configurado em `.mcp.json` e le a chave
de `MUVTA_API_KEY` — a chave nao entra no repositorio.

## Licenca

MIT — veja [LICENSE](LICENSE).
