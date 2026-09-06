# Deployment

## Ambientes

Development, staging/homologação e produção usam projetos Firebase, bancos, storage, credenciais fiscais e bancárias separados. Nunca reutilize certificado, API key ou webhook secret entre ambientes.

## Pipeline

1. `corepack pnpm install --frozen-lockfile`
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`
3. aplicar migrations de `apps/api/migrations` em ordem;
4. publicar regras e índices com `firebase deploy --only firestore`;
5. implantar API e workers com as variáveis de `.env.example` vindas do secret manager;
6. verificar `/api/v1/health`, `/api/v1/openapi.json` e uma operação sintética por integração habilitada;
7. liberar os frontends e monitorar erros, filas e webhooks.

Rollback de aplicação usa a imagem anterior. Migrations destrutivas exigem estratégia expand/contract e nunca são revertidas automaticamente. Firestore, PostgreSQL e Storage precisam de backup e teste periódico de restauração. Os RPO/RTO definitivos ainda dependem de aprovação operacional.

O Android requer Android SDK 35, JDK 17+, `google-services.json` por ambiente e assinatura armazenada fora do repositório.
