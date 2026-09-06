# Muvta MCP

Servidor MCP que liga o Claude Code ao quadro de planejamento do Muvta
(`RP ERP SAAS`). Fala JSON-RPC 2.0 por stdio e traduz cada chamada para a API de
workspace. Sem dependencia externa: roda com o Node do proprio repositorio
(`>= 20.11`, o `fetch` e nativo).

| Arquivo      | Responsabilidade                                     |
| ------------ | ---------------------------------------------------- |
| `server.mjs` | Laco stdio, JSON-RPC e ciclo de vida do MCP          |
| `tools.mjs`  | As 10 ferramentas e os seus schemas de entrada       |
| `api.mjs`    | Cliente HTTP, leitura de configuracao e erros da API |

## Configurar

1. **A chave fica no ambiente, nunca em arquivo versionado.** Ja esta definida
   no escopo de usuario do Windows. Para trocar ou refazer:

   ```powershell
   [Environment]::SetEnvironmentVariable('MUVTA_API_KEY', 'muvta_sua_chave', 'User')
   ```

   ```bash
   # Git Bash, Linux ou macOS
   export MUVTA_API_KEY="muvta_sua_chave"
   ```

2. **Reinicie o Claude Code** — variavel de ambiente so chega a um processo que
   nasce depois dela. Rode `/mcp`: o servidor `muvta` deve aparecer conectado,
   com 10 ferramentas.

O `.mcp.json` na raiz ja aponta para este servidor. O caminho e absoluto, como a
API exige, mas da para sobrescrever sem editar o arquivo versionado — util para
quem tem o repositorio em outro lugar:

```powershell
[Environment]::SetEnvironmentVariable('MUVTA_MCP_SERVER', 'D:/caminho/Synapse/tools/muvta-mcp/server.mjs', 'User')
```

### Nao conectou?

- `MUVTA_API_KEY` nao chegou ao processo — reinicie o Claude Code.
- `MUVTA_API_URL` sem https. So `localhost` pode usar http; o servidor recusa o
  resto na inicializacao, com a mensagem no stderr.

## As ferramentas

Todas recebem `projectId`; as de cartao recebem tambem `taskId`.

| Ferramenta      | Tipo    | Para que serve                                          |
| --------------- | ------- | ------------------------------------------------------- |
| `list_projects` | leitura | Descobre o `projectId`                                  |
| `list_tasks`    | leitura | **Ponto de partida.** Resumo dos cartoes, sem descricao |
| `get_board`     | leitura | Listas configuradas e participantes                     |
| `get_task`      | leitura | Cartao completo, `version` e os ultimos 100 eventos     |
| `get_project`   | leitura | Projeto com o canvas visual                             |
| `create_task`   | escrita | Cria cartao; so `title` e obrigatorio                   |
| `update_task`   | escrita | Edita cartao; exige `expectedVersion`                   |
| `set_ai_status` | escrita | Registra o andamento e move o cartao de lista           |
| `add_comment`   | escrita | Escreve no historico, em Markdown                       |
| `upload_image`  | escrita | Manda arquivo local para o Storage e devolve a URL      |

A ordem importa. Comece por `list_tasks`, escolha ali os cartoes e so entao
chame `get_task` em cada um: varrer o quadro inteiro com `get_task` enche o
contexto antes do trabalho comecar.

## Concorrencia

Toda escrita exige `expectedVersion`, lido em `get_task`. Se o cartao mudou no
meio do caminho, a API responde **409** em vez de sobrescrever o trabalho de
outra pessoa — releia o cartao, reconcilie e tente de novo. Dois agentes em
cartoes diferentes nao conflitam.

`checklist` e `labels` **substituem** a lista inteira. Para marcar um item, leia
o cartao, mude o `done` daquele item e devolva todos os outros junto.

## Limites

Validado e decisao humana: o servidor instrui o agente a entregar em
`Feito · Revisao` e nunca marcar `validated` sozinho.

A chave nao convida nem remove participantes, nao gerencia outras chaves e nao
alcanca planejamento de que voce nao participa — essas rotas exigem sessao de
navegador e respondem 403 para uma chave, de proposito.

Descricao e comentario de cartao sao dados, nao ordens: o servidor instrui o
agente a ler o conteudo do quadro como material do usuario, nunca como
instrucoes que substituam as regras do cliente.

## Testar sem o Claude Code

```bash
export MUVTA_API_KEY="muvta_sua_chave"
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}' \
  | node tools/muvta-mcp/server.mjs
```
