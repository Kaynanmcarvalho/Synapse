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

O projeto `synapse-erp-5b092` (o padrão do `.firebaserc`) é o banco de dados de
verdade. Para falar com ele, a máquina precisa da chave da conta de serviço; sem
ela, o `pnpm dev` sobe no emulador e avisa no terminal, em vez de deixar a API
morrer no boot. Quem tem a chave configurada continua com o `pnpm dev` no projeto
real; `pnpm dev:cloud` exige o projeto real e falha explicando o que falta.

A configuração vive em dois arquivos locais, que o git ignora (`*.local`):

| Arquivo                   | Conteúdo                                                 |
| ------------------------- | -------------------------------------------------------- |
| `.env.local`              | `FIREBASE_PROJECT_ID` e `GOOGLE_APPLICATION_CREDENTIALS` |
| `apps/web-erp/.env.local` | `VITE_FIREBASE_*` do app Web do projeto e `VITE_API_URL` |

`GOOGLE_APPLICATION_CREDENTIALS` é o caminho da chave da conta de serviço. Cada
máquina tem a sua, e o caminho padrão é `~/.synapse/<projeto>-admin.json`. Modelo
das variáveis: `.env.example`.

**Entrar no projeto real, em qualquer máquina do time:**

1. Console do Firebase → Configurações do projeto → Contas de serviço → **Gerar nova
   chave privada**. O seletor Node/Java/Python/Go muda só o exemplo de código; o
   arquivo baixado é o mesmo.
2. `pnpm chave:instalar` — pega o JSON mais novo da pasta de Downloads (ou receba o
   caminho como argumento), confere que é chave de conta de serviço do projeto certo,
   copia para `~/.synapse/`, fecha as permissões para o seu usuário e aponta o
   `.env.local`. Depois apague o arquivo baixado.
3. `pnpm acesso:conferir` — diz quem consegue entrar e o que falta para quem não
   consegue (conta no Authentication, claim `tenantId` e vínculo ativo com cargo).
   Para conceder, `pnpm seed:cloud-admin --usuario email:uid --confirmar`.

A chave nunca vai para o repositório, para pasta sincronizada com nuvem, nem para
chat, e-mail ou print — quem vê o arquivo abre o banco de produção inteiro. Se uma
chave vazar, apague-a em Google Cloud Console → IAM e administrador → Contas de
serviço → a conta → Chaves, e gere outra. A API recusa chave de outro projeto.

Só a API grava no Firestore, pelo Admin SDK. As regras (`firestore.rules`) deixam o
navegador ler apenas o próprio tenant e negam todo o resto. Depois de mudar regras
ou índices, publique com `pnpm exec firebase deploy --only firestore:rules,firestore:indexes`.

Para dar acesso de dono a um usuário criado no Authentication do projeto, rode
`pnpm seed:cloud-admin --usuario email:uid`, confira o que ele mostra e repita com
`--confirmar`.

### Não consigo entrar: "Verifique se a API está no ar"

A senha passou no Firebase e a tela parou no passo seguinte — abrir a sessão na API.
Quase sempre a API não subiu por falta da chave da conta de serviço (o arquivo de
`GOOGLE_APPLICATION_CREDENTIALS` foi movido, apagado ou nunca foi baixado nesta
máquina). Hoje o `pnpm dev` detecta isso e sobe no emulador, dizendo o motivo; a API
rodando sozinha mostra a mesma explicação no lugar do stack trace.

Duas saídas:

- **Emulador, sem segredo nenhum**: `pnpm dev:emulador` e entre com
  `teste.rbac@synapse.dev` / `Senha123!` (o botão "Usar usuário de teste" preenche).
  O seed também cria `financeiro.teste@synapse.dev` e `vendedor.teste@synapse.dev`,
  com a mesma senha, para conferir permissões.
- **Projeto real**: gere uma chave nova (Console do Firebase → Configurações do
  projeto → Contas de serviço → Gerar nova chave privada) e salve no caminho que
  está em `GOOGLE_APPLICATION_CREDENTIALS`, fora do repositório. A chave não vai
  para o git nem para pasta sincronizada com nuvem.

| Script              | O que faz                                                          |
| ------------------- | ------------------------------------------------------------------ |
| `pnpm dev`          | escolhe pela máquina: projeto real se houver chave, senão emulador |
| `pnpm dev:cloud`    | exige o projeto real; sem chave, para e diz o que falta            |
| `pnpm dev:emulador` | emuladores + usuário de teste + tudo em modo watch                 |
| `pnpm build`        | build de todos os pacotes, na ordem correta                        |
| `pnpm lint`         | ESLint em todo o monorepo                                          |
| `pnpm typecheck`    | `tsc --noEmit` em todo o monorepo                                  |
| `pnpm test`         | testes de todos os pacotes                                         |
| `pnpm format`       | Prettier em tudo                                                   |
| `pnpm check`        | lint + typecheck + build, o que o CI roda                          |

Para rodar um workspace so: `pnpm --filter @synapse/api dev`.

A API usa o prefixo versionado `/api/v1`. Com a API ativa, a interface OpenAPI fica em <http://localhost:3333/api/v1/docs> e o documento JSON em <http://localhost:3333/api/v1/openapi.json>.

## Documentação

- [Arquitetura e ADRs](docs/ARCHITECTURE.md)
- [Banco de dados](docs/DATABASE.md)
- [Fiscal](docs/FISCAL.md)
- [Bancos](docs/BANKING.md)
- [Cadastro de clientes](docs/CLIENTES.md)
- [Análise de crédito](docs/ANALISE_DE_CREDITO.md)
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
