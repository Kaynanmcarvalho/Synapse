# Autenticação, sessões e isolamento multi-tenant

## Fluxo confiável

1. O cliente autentica com e-mail/senha pelo Firebase Auth.
2. O cliente envia ID token em `Authorization: Bearer`, App Check em `X-Firebase-AppCheck` e a sessão em `X-Device-Session`.
3. A API valida App Check e o ID token com verificação de revogação.
4. `tenantId` vem exclusivamente da claim assinada; corpo e query contendo esse campo recebem `403`.
5. A API confirma o vínculo ativo em `tenants/{tenantId}/users/{uid}` e monta `TenantContext`.
6. Repositórios recebem `tenantId` do contexto e constroem caminhos sob `tenants/{tenantId}`.

## Configuração Firebase

- Habilitar Email/Password no Firebase Authentication.
- Fazer upgrade para Authentication with Identity Platform e habilitar TOTP se MFA for usado.
- Registrar os apps web/Android no App Check e configurar reCAPTCHA Enterprise no web.
- Conceder ao service account da API acesso ao Auth, Firestore e verificação de App Check.
- Nunca versionar `FIREBASE_PRIVATE_KEY`; usar secret manager em staging/produção.

## Sessões

Após login, o cliente chama `POST /api/v1/auth/sessions` sem `X-Device-Session`, recebe o ID e passa a enviá-lo. A revogação individual marca somente essa sessão; a revogação administrativa global também chama `revokeRefreshTokens`, invalidando todos os refresh tokens do usuário.

## Onboarding

`POST /api/v1/onboarding/company` exige JWT e App Check, mas ainda não exige tenant/sessão. A API cria tenant, empresa e vínculo `ADMIN_EMPRESA` em transação e define a claim `tenantId`. O cliente deve forçar refresh do ID token antes da próxima chamada.

## Segurança

- Rotas são privadas por padrão; apenas `@Public()` remove JWT e App Check.
- MFA obrigatório é verificado pelo vínculo e pela claim de segundo fator.
- Administração consulta roles do vínculo armazenado no servidor.
- Firestore Rules permitem leitura apenas quando `request.auth.token.tenantId` coincide com o caminho e negam escritas diretas.
- RBAC granular permanece no cartão próprio; esta fase garante apenas o limite administrativo mínimo.
