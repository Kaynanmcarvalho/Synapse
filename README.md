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

## Começando

Requisitos: Node 24 (`.nvmrc`), pnpm 10 e Java 11 ou mais novo — o emulador do
Firestore roda na JVM.

```bash
corepack enable pnpm   # uma vez por máquina; no Windows sem admin:
                       # corepack enable --install-directory "$env:APPDATA/npm" pnpm
pnpm install
pnpm dev:emulador      # emuladores do Firebase + usuário de teste + api e apps web
```

`npm run dev:emulador` faz o mesmo. O turbo precisa do pnpm instalado, mesmo quando
o comando é chamado pelo npm.

### Emulador

O `pnpm dev:emulador` não precisa de `.env` nem de conta no Firebase. Ele roda contra
o Firebase Emulator Suite (projeto `demo-synapse`), mesmo com os `.env.local` do
projeto real presentes, e, a cada início, garante o usuário que as telas do web-erp
já trazem preenchido:

| Campo   | Valor                               |
| ------- | ----------------------------------- |
| E-mail  | `teste.rbac@synapse.dev`            |
| Senha   | `Senha123!`                         |
| Empresa | `tenant-dev`, cargo `ADMIN_EMPRESA` |

| Serviço         | Endereço                       |
| --------------- | ------------------------------ |
| API             | <http://localhost:3333/api/v1> |
| web-erp         | <http://localhost:5173>        |
| web-admin       | <http://localhost:5174>        |
| web-vendedor    | <http://localhost:5175>        |
| Auth emulador   | 127.0.0.1:9099                 |
| Firestore emul. | 127.0.0.1:8080                 |

Os dados do emulador ficam em `.firebase/emulators` (fora do git) e voltam na
próxima execução. Para começar do zero, apague essa pasta com o emulador parado.

### Projeto Firebase real

O `pnpm dev` usa o projeto `synapse-erp-5b092` (o padrão do `.firebaserc`) como
banco de dados. Ele lê dois arquivos locais, que o git ignora (`*.local`):

| Arquivo                   | Conteúdo                                                 |
| ------------------------- | -------------------------------------------------------- |
| `.env.local`              | `FIREBASE_PROJECT_ID` e `GOOGLE_APPLICATION_CREDENTIALS` |
| `apps/web-erp/.env.local` | `VITE_FIREBASE_*` do app Web do projeto e `VITE_API_URL` |

`GOOGLE_APPLICATION_CREDENTIALS` é o caminho da chave da conta de serviço (Console
do Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave
privada). A chave fica fora do repositório e fora de pastas sincronizadas com nuvem;
a API recusa uma chave de outro projeto. Modelo das variáveis: `.env.example`.

Só a API grava no Firestore, pelo Admin SDK. As regras (`firestore.rules`) deixam o
navegador ler apenas o próprio tenant e negam todo o resto. Depois de mudar regras
ou índices, publique com `pnpm exec firebase deploy --only firestore:rules,firestore:indexes`.

Para dar acesso de dono a um usuário criado no Authentication do projeto, rode
`pnpm seed:cloud-admin --usuario email:uid`, confira o que ele mostra e repita com
`--confirmar`.

| Script              | O que faz                                          |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | tudo em modo watch contra o projeto Firebase real  |
| `pnpm dev:emulador` | emuladores + usuário de teste + tudo em modo watch |
| `pnpm build`        | build de todos os pacotes, na ordem correta        |
| `pnpm lint`         | ESLint em todo o monorepo                          |
| `pnpm typecheck`    | `tsc --noEmit` em todo o monorepo                  |
| `pnpm test`         | testes de todos os pacotes                         |
| `pnpm format`       | Prettier em tudo                                   |
| `pnpm check`        | lint + typecheck + build, o que o CI roda          |

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
