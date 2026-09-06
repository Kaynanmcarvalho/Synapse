# Segurança e LGPD

Referência: spec §31 (segurança), §49 (LGPD), §62 (proibições). Card
**[F10] Segurança e LGPD**. Esta é uma revisão do estado real do código, não
um checklist de intenções — cada item diz o que existe, onde, e o que falta.

## §31 — superfície de ataque

| Controle                        | Onde                                                                                                                                                        | Estado                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| JWT validado no backend         | `common/guards/public.guard.ts` (`AuthGuard`) — `auth.verifyIdToken(token, true)`, com checagem de revogação                                                | ✅                                                                                   |
| RBAC                            | `modules/iam` — catálogo de 28 permissões, 8 roles fixas + cargo personalizado (`docs/PERMISSIONS.md`)                                                      | ✅                                                                                   |
| Isolamento de tenant            | `TenantContextInterceptor` resolve o tenant do membership, nunca do cliente; `UntrustedClaimsGuard` recusa `tenantId`/`role`/`permission` no corpo ou query | ✅, testado em `tenant-isolation.spec.ts`                                            |
| Rate limit                      | `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])`, global via `APP_GUARD`                                                                            | ✅ — por IP (padrão do Nest Throttler); **não é por usuário ainda** (ver Pendências) |
| CORS                            | `app.enableCors({ origin: config.corsOrigins, credentials: true })` em `main.ts`, lista vem de `CORS_ORIGINS`                                               | ✅                                                                                   |
| Helmet                          | `app.use(helmet())` em `main.ts`                                                                                                                            | ✅                                                                                   |
| Validação Zod em toda rota      | Ver seção "Achado principal" abaixo — havia rotas com validação **quebrada em silêncio**                                                                    | ⚠️ corrigido nesta revisão                                                           |
| Proteção contra NoSQL injection | Ver "Consultas ao Firestore" abaixo                                                                                                                         | ✅ com uma ressalva                                                                  |
| App Check                       | `AppCheckGuard`, com `APP_CHECK_ENFORCEMENT=false` só fora de produção (não existe emulador de App Check)                                                   | ✅ em produção; **não testável localmente**                                          |
| Logs de segurança               | `AuditRepository` + `MutationAuditInterceptor` registram toda mutação (before/after, ator, IP, dispositivo)                                                 | ✅                                                                                   |

## Achado principal: guard de permissão fechado por padrão

O `PermissionInterceptor` (RBAC, cartão anterior) tinha esta linha:

```ts
if (!required) return next.handle();
```

Uma rota **sem** `@RequirePermission` passava direto — nenhuma checagem de
autorização acontecia. `docs/PERMISSIONS.md` já documentava o comportamento
contrário ("fechada por padrão"), mas o código não fazia isso. Na prática,
qualquer membro autenticado do tenant podia chamar qualquer rota nova que
alguém esquecesse de decorar — e várias esqueceram, porque o build e os
testes passam de qualquer jeito (a ausência de `@RequirePermission` não é um
erro de tipo).

Corrigido: agora lança `ForbiddenException` quando a rota não tem
`@RequirePermission`, `@SkipPermission()` nem `@Public()`. Foi preciso criar
`@SkipPermission()` — diferente de `@Public()`, que também libera o
`AuthGuard` — para as duas rotas que legitimamente não precisam de permissão
de negócio mas continuam exigindo login: `POST /onboarding/company` (não há
tenant ainda) e `/auth/sessions/*` (cada um mexe só na própria sessão).

Todas as rotas existentes no momento desta revisão receberam
`@RequirePermission` (28 handlers em 11 controllers — ver
`docs/PERMISSIONS.md` para a matriz de permissões). A regra a partir de agora:
**toda rota nova precisa de `@RequirePermission` ou `@SkipPermission()`
explícito, ou fica bloqueada em produção com 403.**

## Achado: `@UsePipes` no método também valida `@CurrentTenant`/`@CurrentUser`

`ZodValidationPipe.transform()` ignora `ArgumentMetadata` e valida qualquer
valor que o Nest mande — incluindo o objeto resolvido por `@CurrentTenant()`
ou `@CurrentUser()`, não só o `@Body()`. Um `@UsePipes(schema)` no método
tentava validar o `TenantContext` contra o schema do corpo e sempre falhava.

Isso deixava **quebradas em silêncio** (400 constante, nunca alcançavam a
lógica de negócio) as seguintes rotas, corrigidas nesta revisão:

- `POST /onboarding/company`
- `POST /auth/sessions`
- `PATCH /admin/users/:id/blocked` e `/mfa-required`
- `POST/PATCH /catalog/partners/*` (clientes e fornecedores)
- `POST /fiscal/nfe`, `POST /fiscal/nfe/:id/cancel`, `.../correction`
- `POST /sales/pos/cash-sessions*` (todas as rotas de PDV)

Correção: mover o pipe para o parâmetro (`@Body(new ZodValidationPipe(schema))`)
em vez de `@UsePipes` no método. Verificado via HTTP real contra o emulador —
não só teste unitário, já que o bug só aparece na camada de pipes do Nest.

## Revisão item a item das proibições do §62

| Proibição                                                 | Situação                                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Não gerar número de NF-e no frontend                      | ✅ `NfeService` gera; frontend só chama a API                                                                                                              |
| Não baixar estoque só pelo frontend                       | ✅ toda baixa passa por `InventoryService`, transacional, com idempotência                                                                                 |
| Não tratar estoque local do vendedor como definitivo      | N/A ainda — app offline (F7) não existe                                                                                                                    |
| Não expor secret bancário nem certificado fiscal no React | ✅ `SecretVaultService` (AES-256-GCM) guarda o segredo; `FiscalConfigService` devolve só `*SecretRef`, nunca o valor. Ver ressalva de armazenamento abaixo |
| Não confiar em role do cliente                            | ✅ `UntrustedClaimsGuard` recusa `role`/`roles`/`permission`/`permissions` no corpo ou query                                                               |
| Não permitir troca de tenantId pelo navegador             | ✅ mesmo guard recusa `tenantId`; o tenant real vem do membership, nunca do request                                                                        |
| Não permitir estoque negativo sem regra explícita         | ⚠️ a regra existe (`InventoryService.change`) mas o _override_ está morto — ver Pendências                                                                 |
| Não duplicar webhook nem pedido offline                   | ✅ padrão de `idempotencyKey` já em uso em `InventoryRepository.transact`; webhooks (F6) ainda não existem                                                 |

## Consultas ao Firestore

Firestore não tem injeção de SQL no sentido clássico, mas duas classes de
problema equivalentes foram checadas:

- **Nome de campo vindo do cliente.** Nenhuma consulta usa um valor do
  request como _nome de campo_ em `.where()` — sempre é o valor que varia,
  nunca o campo. OK.
- **Path traversal em upload.** `catalog/services/photo-storage.service.ts`
  gera o nome do arquivo com `randomUUID()`, nunca com o nome original — o
  nome que o cliente manda nunca vira parte de um caminho no disco.

## LGPD (§49)

Módulo novo: `modules/compliance`. O único titular de dados que o sistema
conhece hoje é o **cliente** (`catalog/partners`) — funcionário/vendedor
interno entra quando existir um cadastro de RH próprio.

| Item                  | Endpoint                                    | Nota                                                                                                                                                 |
| --------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consentimento         | `POST/GET /compliance/subjects/:id/consent` | Log append-only por finalidade (MARKETING, DATA_SHARING, ESSENTIAL); o estado vigente é o último registro de cada finalidade                         |
| Exportação            | `GET /compliance/subjects/:id/export`       | Cadastro + histórico de atendimento + todo consentimento já registrado                                                                               |
| Anonimização/exclusão | `POST /compliance/subjects/:id/anonymize`   | Recusa quando `openCredit > 0` — a guarda fiscal/financeira prevalece até a pendência ser resolvida, como o §49 prevê ("quando legalmente possível") |

Testado via HTTP real: criar cliente → registrar consentimento → exportar →
anonimizar → exportar de novo confirma que os campos pessoais sumiram
(nome, CPF, e-mail, telefone, endereço).

**Extensibilidade.** `DataSubjectService.exportSubjectData`/`anonymize` hoje
cobrem só o domínio de clientes. Cada domínio novo que guardar dado pessoal
(fornecedor, vendedor externo) deve ganhar sua própria seção no export e sua
própria regra de anonimização — não existe um registro genérico de
exportadores porque só há um domínio real para testar contra hoje; criar essa
abstração agora seria generalizar a partir de uma amostra de um.

## Pendências (não bloqueiam este cartão, mas precisam de dono)

1. **Rate limit é só por IP, não por usuário.** Um usuário autenticado atrás
   de um NAT/proxy corporativo compartilha a cota com todos ali. Precisa de
   uma segunda camada de throttling chaveada por `tenant.userId`.
2. **Override de estoque negativo está morto.** `InventoryService.change`
   verifica `context.roleIds.includes('inventory.allow_negative')` — mas
   `roleIds` guarda _chaves de cargo_ (`ADMIN_EMPRESA`, um id de cargo
   personalizado), nunca uma string de permissão. Essa condição nunca é
   verdadeira para ninguém. Efeito prático: mais restritivo que o intended
   (nunca permite negativo), não uma brecha — mas a feature "permitir com
   permissão explícita" não funciona. O mesmo padrão aparece em
   `TransferService.approve` (`'inventory.transfer.approve'`). Precisa trocar
   por `RoleService.hasPermission(context, 'estoque.ajustar')` (ou uma
   permissão dedicada) — não mexi porque são arquivos de outro cartão em
   desenvolvimento ativo no momento desta revisão.
3. **Cofre de segredos fiscais é só em memória.** `SecretVaultService` guarda
   o certificado A1/senha/CSC cifrados num `Map` — some a cada restart do
   processo. Funciona para dev; produção precisa de um backend persistente
   (Secret Manager, ou o próprio Firestore com o valor já cifrado).
4. **`customerHistory` não filtra por tenant.** `partner.repository.ts`
   filtra o histórico só por `customerId` — como os ids são UUIDs
   praticamente não colidem entre tenants na prática, mas o filtro correto
   deveria checar `tenantId` também, pelo mesmo princípio de isolamento do
   resto do sistema.
5. **Pentest interno (c39-9)** e **exportação de dados de USER** (só CUSTOMER
   está coberto) ficam para quando o RH/onboarding de funcionário existir.

## Como testar

Toda verificação acima rodou contra os emuladores locais do Firebase
(Auth + Firestore) com um usuário e tenant reais — não só teste unitário.
Ver `packages/*/src/**/*.spec.ts` e `apps/api/src/**/*.spec.ts` para a
cobertura automatizada (106 testes na API no momento desta revisão).
