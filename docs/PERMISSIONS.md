# Permissões, cargos e configuração herdada

Referência: spec §3 (RBAC) e §4 (configuração herdada). Implementado em
`apps/api/src/modules/iam`.

## Catálogo de permissões

Formato `modulo.operacao`, definido em `packages/types/src/iam/permissions.ts`:

| Permissão               | O que libera                                        |
| ----------------------- | --------------------------------------------------- |
| `produto.visualizar`    | Ver o cadastro de produtos                          |
| `produto.criar`         | Criar produto                                       |
| `produto.editar`        | Editar produto                                      |
| `produto.excluir`       | Excluir produto                                     |
| `produto.importar`      | Importação em massa por planilha                    |
| `estoque.visualizar`    | Ver saldo de estoque                                |
| `estoque.ajustar`       | Ajuste manual de estoque                            |
| `estoque.transferir`    | Transferência entre filiais                         |
| `estoque.inventariar`   | Inventário físico                                   |
| `venda.criar`           | Abrir orçamento/pedido/venda                        |
| `venda.editar`          | Editar venda em aberto                              |
| `venda.cancelar`        | Cancelar venda                                      |
| `venda.aprovarDesconto` | Aprovar desconto acima do limite do vendedor        |
| `fiscal.emitir`         | Emitir NF-e/NFC-e                                   |
| `fiscal.cancelar`       | Cancelar documento fiscal                           |
| `fiscal.visualizar`     | Ver documentos fiscais                              |
| `financeiro.visualizar` | Ver contas a pagar/receber                          |
| `financeiro.editar`     | Editar lançamentos financeiros                      |
| `financeiro.conciliar`  | Conciliação bancária                                |
| `filial.gerenciar`      | CRUD de filiais                                     |
| `filial.configurar`     | Ler/gravar configuração herdada                     |
| `cargo.gerenciar`       | CRUD de cargos e permissões                         |
| `usuario.gerenciar`     | Bloquear usuário, exigir MFA, revogar sessão        |
| `preco.gerenciar`       | Gerenciar tabelas de preço e promoções              |
| `preco.negociarExtra`   | Negociar preço acima da tabela, sujeito a aprovação |

## Escopo de uma permissão

Um `PermissionGrant` pode trazer `scope.branchIds` e `scope.warehouseIds` —
os dois eixos do §3 ("por filial e por depósito"), verificados de forma
independente e idêntica. Para cada eixo informado na chamada, duas
restrições se aplicam — as duas precisam passar:

1. **A do grant.** Sem `scope` naquele eixo, vale em qualquer filial/depósito.
   Com `scope.branchIds`/`scope.warehouseIds`, só nos listados ali.
2. **A do membership.** `TenantContext.branchIds`/`warehouseIds` vem do
   vínculo do usuário com o tenant (`tenants/{tenantId}/users/{userId}`).
   Vazio significa usuário **não restrito** — é o caso normal de
   `ADMIN_EMPRESA`, que fecha a empresa inteira. Uma lista preenchida
   restringe às filiais/depósitos daquele vínculo.

`@RequirePermission(permissao, branchParam?, warehouseParam?)` aceita o nome
de até dois `@Param` da rota para checar cada eixo contra o escopo.

Exemplo do §3 — cargo "Supervisor Regional": vê produto e estoque em três
filiais, cancela venda em uma delas, não toca no fiscal:

```json
{
  "name": "Supervisor Regional",
  "permissions": [
    { "permission": "produto.visualizar" },
    {
      "permission": "estoque.visualizar",
      "scope": { "branchIds": ["goiania", "anapolis", "aparecida"] }
    },
    { "permission": "venda.cancelar", "scope": { "branchIds": ["goiania"] } }
  ]
}
```

## Cargos padrão (§3)

Fixos, definidos em código (`apps/api/src/modules/iam/permission-catalog.ts`) —
não são documentos e não podem ser editados nem excluídos.

| Cargo              | Perfil                                                                   |
| ------------------ | ------------------------------------------------------------------------ |
| `SUPER_ADMIN_SAAS` | Opera a plataforma inteira, todas as empresas                            |
| `ADMIN_EMPRESA`    | Administra a empresa toda — todas as permissões, sem restrição de filial |
| `ADMIN_FILIAL`     | Administra a filial: sem `usuario.gerenciar` nem `cargo.gerenciar`       |
| `GERENTE`          | Opera o dia a dia da filial, sem excluir produto nem cancelar fiscal     |
| `VENDEDOR`         | Cria e edita venda, vê produto e estoque, sem emitir fiscal              |
| `CAIXA`            | Fecha venda e emite NFC-e, sem editar produto                            |
| `ESTOQUE`          | Só o módulo de estoque                                                   |
| `FINANCEIRO`       | Só o módulo financeiro, mais leitura de produto e fiscal                 |
| `PERSONALIZADO`    | Marca um cargo criado pela empresa — ver abaixo                          |

## Cargo personalizado

`POST /iam/roles` cria um cargo com `isCustom: true`, guardado por tenant.
`PATCH`/`DELETE` funcionam só nesses — chamar com o id de um cargo padrão
(`ADMIN_EMPRESA`, etc.) devolve 400/409. Endpoints em
`apps/api/src/modules/iam/controllers/roles.controller.ts`, protegidos por
`cargo.gerenciar`.

## Onde o guard entra

`PermissionInterceptor` (`apps/api/src/modules/iam/interceptors/permission.interceptor.ts`)
é um `APP_INTERCEPTOR` global — cobre toda rota da API, não só as do módulo IAM.
Uma rota sem `@RequirePermission(...)` fica **fechada** por padrão, a menos que
tenha `@Public()`. Ele roda depois do `TenantContextInterceptor` de propósito:
guards executam antes de interceptors no ciclo do Nest, e o `request.tenant`
só existe depois que aquele interceptor roda — por isso o checador de
permissão também é um interceptor, não um guard.

```ts
@Get(':id')
@RequirePermission('filial.configurar', 'id') // 'id' = nome do @Param a checar contra o escopo
getForBranch(@Param('id') id: string) { ... }
```

## Configuração herdada (§4)

Três níveis: `tenants/{tenantId}` (global) e `tenants/{tenantId}/branches/{id}`
(override). Toda chave usa o prefixo do domínio: `precos.*`, `fiscal.*`,
`estoque.*`, `vendas.*`, `financeiro.*`, `comissao.*`, `formasPagamento.*`,
`descontos.*`, `limites.*`, `emissaoFiscal.*` — os dez domínios da seção 4.
A lista fica em `packages/types/src/config/index.ts` (`CONFIG_DOMAINS`); o
mecanismo de resolução é o mesmo para qualquer chave sob esses prefixos.

| Rota                                         | Efeito                                         |
| -------------------------------------------- | ---------------------------------------------- |
| `GET /iam/config/:key`                       | Valor global do tenant, origem sempre `GLOBAL` |
| `PUT /iam/config/:key`                       | Define o valor global                          |
| `GET /iam/branches/:branchId/config/:key`    | Valor resolvido para a filial                  |
| `PUT /iam/branches/:branchId/config/:key`    | Sobrescreve na filial (`OVERRIDE`)             |
| `DELETE /iam/branches/:branchId/config/:key` | Remove a sobrescrita — volta a herdar          |

Exemplo do card: margem global 20%, Goiânia sobrescreve para 18%, Aparecida
não mexe e continua herdando os 20%.

```
PUT /iam/config/precos.margemPadrao            { "value": 20 }
GET /iam/branches/aparecida/config/precos.margemPadrao
  -> { "key": "precos.margemPadrao", "value": 20, "source": "INHERITED" }

PUT /iam/branches/goiania/config/precos.margemPadrao   { "value": 18 }
GET /iam/branches/goiania/config/precos.margemPadrao
  -> { "key": "precos.margemPadrao", "value": 18, "source": "OVERRIDE" }

DELETE /iam/branches/goiania/config/precos.margemPadrao
GET /iam/branches/goiania/config/precos.margemPadrao
  -> { "key": "precos.margemPadrao", "value": 20, "source": "INHERITED" }
```

A função pura por trás disso é `resolveConfigValue` em
`config-resolution.service.ts` — testada isoladamente, sem precisar de banco,
em `config-resolution.service.spec.ts`.

## Persistência

Nesta fase, `RoleRepository`, `BranchRepository` e `ConfigRepository` guardam
em memória (`Map`, chave `tenantId:id`) — o mesmo padrão usado por
`PartnerRepository` e `CashSessionRepository` nos módulos vizinhos. Os dados
não sobrevivem a um restart da API. Trocar para Firestore é implementar as
mesmas três classes sobre `TenantFirestoreRepository`
(`apps/api/src/modules/iam/repositories/tenant-firestore.repository.ts`), que
já resolve o caminho `tenants/{tenantId}/{colecao}`; a assinatura pública dos
services não muda.
