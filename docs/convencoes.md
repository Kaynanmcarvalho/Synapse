# Convencoes de codigo

Referencia: spec §52, §53, §70.

## TypeScript

`strict` ligado em todo o monorepo, mais `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes` e `noImplicitOverride`. O preset esta em
[`tsconfig.base.json`](../tsconfig.base.json); ninguem redefine essas flags para afrouxar.

`any` e erro de lint. Quando o tipo e realmente desconhecido, use `unknown` e estreite.

Ids de dominio sao tipos nominais (`TenantId`, `BranchId`, ...) definidos em
`packages/types/src/common/branded.ts`. Isso impede passar um id de filial onde se espera
um id de tenant — um erro que compila mas quebra o isolamento entre empresas.

## Um arquivo, uma responsabilidade

Controller, service, repository, provider, DTO, validator, guard, interceptor, event e job
ficam em arquivos separados. O ESLint avisa acima de 300 linhas por arquivo e 80 por funcao;
o aviso e um cheiro, nao um teto a perseguir.

## Camadas da API

```
controller  ->  service  ->  repository  ->  Firestore
```

- **controller** traduz HTTP em chamada de servico. Sem regra de negocio.
- **service** concentra a regra. Nao conhece `Request`, `Response` nem Firestore.
- **repository** e o unico lugar que fala com o banco. Toda consulta passa por ele.

Quebrar a direcao dessas setas (um controller lendo o Firestore, um service devolvendo
`Response`) e o tipo de coisa que a revisao recusa.

## Validacao

Schemas Zod moram em `packages/validation` e sao compartilhados entre API e web — a mesma
regra valida os dois lados. Na API, o `ZodValidationPipe` faz a ponte com o pipeline do Nest.

## Nomes

| Tipo              | Padrao                | Exemplo                  |
| ----------------- | --------------------- | ------------------------ |
| Arquivo de classe | `kebab-case.tipo.ts`  | `product.repository.ts`  |
| Componente React  | `PascalCase.tsx`      | `Button.tsx`             |
| Modulo Nest       | `<dominio>.module.ts` | `catalog.module.ts`      |
| Schema Zod        | `<nome>.schema.ts`    | `product.schema.ts`      |
| Teste             | `<arquivo>.spec.ts`   | `health.service.spec.ts` |

Variaveis, funcoes e propriedades em `camelCase`; tipos e classes em `PascalCase`;
constantes de modulo em `SCREAMING_SNAKE_CASE`.

## Multi-tenant

Todo dado de cliente nasce sob `tenants/{tenantId}/...`. Os caminhos estao centralizados em
`packages/firebase/src/common/collections.ts` — nenhum caminho de colecao e escrito a mao no
meio de um service. O detalhe de como o isolamento e garantido nas regras do Firestore fica no
cartao **[F1] Multi-tenant e isolamento entre empresas**.

## Commits

`tipo(escopo): descricao no imperativo`, com o cartao entre colchetes quando houver:

```
feat(api): adiciona reserva de estoque [F3]
fix(web-erp): corrige total do pedido com desconto [F4]
chore(repo): sobe o monorepo, tooling e CI [F0]
```

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.
