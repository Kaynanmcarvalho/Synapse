# Synapse Design Language (SDL)

As decisões visuais do Synapse num lugar só. Antes disto elas viviam espalhadas:
a paleta no `tailwind.config.cjs` do web-erp, um azul diferente no preset do
`@synapse/ui`, 165 cores escritas à mão dentro das telas e três escalas de texto
disputando o mesmo papel.

Esta primeira etapa é **fundação, não redesign**: todo nome que o ERP já usava
continua com o mesmo valor, e nenhuma tela muda de aparência. O que entra é o
vocabulário semântico que as próximas fases vão adotar.

## Arquitetura

```
tokens/primitivos.js   os valores crus (paleta, escalas, curvas). Ninguém na tela consome daqui.
tokens/semanticos.js   a função de cada valor: superfície, conteúdo, linha, estado, densidade…
tokens/index.js        o que a aplicação importa em JavaScript
tailwind.preset.js     o tema do Tailwind, montado a partir dos tokens
tokens.css             só o que muda em tempo de execução (a cor da marca do tenant)
```

**Por que JavaScript puro, sem build.** O `tailwind.config.cjs` do web-erp
precisa ler os tokens com `require()`, antes de qualquer compilação. Se os
tokens dependessem de um `dist`, o tema quebraria enquanto o pacote não
compilasse — e o mesmo padrão já é usado pelo `@synapse/ui/tailwind.preset.js`.
Os tipos de que o TypeScript precisa estão em `tokens/index.d.ts`.

**Uma fonte de verdade.** O `tailwind.config.cjs` não define valor nenhum: ele
só aplica este preset. O `tokens.css` também não repete o tema — repetir criaria
uma segunda verdade que um dia discordaria da primeira.

## Primitivo x semântico

| Camada    | Exemplo                             | Quem usa                      |
| --------- | ----------------------------------- | ----------------------------- |
| Primitivo | `cobalto[600]`, `neutro[200]`       | só o próprio SDL              |
| Semântico | `estado.perigo.fundo`, `linha.foco` | o tema do Tailwind e as telas |

Nome de token diz **função**, nunca cor física: `estado.perigo.texto` continua
certo se um dia o vermelho mudar; `vermelho500` vira mentira no mesmo dia.

## A marca do tenant

```
/saas/experience (branding.primaryColor)
        ↓  useTenantExperience
--sdl-marca: "73 79 223"          (canais RGB, para permitir opacidade)
        ↓  tailwind.preset.js
colors.primary = rgb(var(--sdl-marca, 73 79 223) / <alpha-value>)
        ↓
bg-primary · text-primary · ring-primary/15 · border-primary/40
```

Nenhuma tela precisa saber o HEX da marca, e o fallback dentro do `rgb()`
garante o cobalto do Synapse mesmo sem o CSS carregado.

Uma ressalva registrada: a API devolve `#2563eb` como branding **padrão** quando
o tenant não tem marca configurada. Esse valor é tratado como "não configurado"
(`useTenantExperience`), senão ligar o branding mudaria a cor de todo mundo —
exatamente o que esta fase não pode fazer.

## Estados: o inventário que originou a taxonomia

As cores abaixo estavam escritas à mão no web-erp. A migração das telas é das
fases seguintes; aqui elas ganham nome.

| Token                    | Valor     | Onde estava (ocorrências)    |
| ------------------------ | --------- | ---------------------------- |
| `estado.perigo.texto`    | `#b3242f` | 79                           |
| `estado.perigo.fundo`    | `#fdeced` | 9                            |
| `estado.bloqueado.texto` | `#931d27` | 1 (hover de botão)           |
| `estado.vencido.fundo`   | `#fff8f8` | 1                            |
| `estado.atencao.texto`   | `#8a4b00` | 21                           |
| `estado.atencao.fundo`   | `#fff3e0` | 3                            |
| `estado.pendente.fundo`  | `#fff4e5` | 1                            |
| `estado.ok.texto`        | `#00664d` | 8                            |
| `estado.ok.fundo`        | `#e6f6f1` | 2                            |
| `superficie.hover`       | `#ececee` | 15                           |
| `superficie.afundado`    | `#fcfcfd` | 4                            |
| `marca.suave`            | `#eef0ff` | 3                            |
| `externo.whatsapp`       | `#25d366` | 3 (cor de marca de terceiro) |

## Camadas (z-index)

A escala sobe de 10 em 10 para caber vizinho novo sem renumerar o resto. O ERP
ainda usa números crus; a migração é gradual.

| Token          | Valor | O que ocupa hoje                          |
| -------------- | ----- | ----------------------------------------- |
| `fixo`         | 30    | cabeçalho do AppShell (`z-30`)            |
| `suspenso`     | 40    | moldura do assistente de NF-e (`z-40`)    |
| `flutuante`    | 50    | painel de menu, menu mobile (`z-50`)      |
| `sobreposicao` | 60    | Modal/Drawer, command palette (`z-[60]`)  |
| `dialogo`      | 70    | diálogos sobre janela                     |
| `janela`       | 80    | janelas arrastáveis do crédito (`z-[80]`) |
| `comando`      | 90    | diálogo do crédito (`z-[90]`)             |
| `aviso`        | 100   | avisos que precisam vencer tudo           |

## Primitives

O vocabulário que as telas usam. Nome de componente em inglês, valor de
propriedade no vocabulário dos tokens (`density="compacta"`, `tone="perigo"`) —
é o mesmo idioma do `tokens/`.

| Primitive           | Para que serve                                                 | Variantes                                                                                                          |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Text`              | a escala tipográfica, por papel                                | tituloTela · tituloSecao · tituloCartao · corpoGrande · corpo · corpoSecundario · rotulo · legenda · dado · codigo |
| `Surface`           | o plano em que o conteúdo se apoia                             | pagina · painel · elevada · afundada                                                                               |
| `Divider`           | separar por linha                                              | horizontal · vertical                                                                                              |
| `Field`             | rótulo, controle, dica e erro amarrados                        | densidade e `span` na grade                                                                                        |
| `Input`             | texto                                                          | densidade · `align` · `invalid`                                                                                    |
| `Select`            | escolha, com `<select>` nativo                                 | densidade · `invalid`                                                                                              |
| `NumberInput`       | quantidade e percentual                                        | herda Input                                                                                                        |
| `MoneyInput`        | valor em real (só apresentação)                                | herda Input                                                                                                        |
| `DocInput`          | CPF, CNPJ, CEP, telefone (máscara vem de fora)                 | herda Input                                                                                                        |
| `Button`            | ação                                                           | primary · secondary · quiet · danger                                                                               |
| `IconButton`        | ação de glifo, com nome acessível obrigatório                  | quiet · secondary · `shape`                                                                                        |
| `Kbd`               | a tecla do atalho                                              | —                                                                                                                  |
| `Status`            | situação                                                       | dot · text · chip, nos 8 tons                                                                                      |
| `Spinner`           | espera                                                         | decorativo ou anunciado                                                                                            |
| `IndiceOperacional` | posição/sequência numa lista real (não decore lista sem ordem) | `destaque`                                                                                                         |

### Três regras que não se negociam

**SURFACE IS NOT CARD.** `Surface` diz em que plano o conteúdo está, não que ele
merece uma caixa. Não injeta padding: quem precisa de respiro decide o respiro.
Quando todo agrupamento vira cartão com sombra, a tela deixa de ter hierarquia.

**STATUS IS NOT ALWAYS A PILL.** O padrão é ponto + texto. Uma tela de ERP mostra
situação em quase toda linha; se cada uma virar chip colorido, o olho perde a
capacidade de achar o que importa. `chip` é exceção, para bloco denso.

**ICON BUTTON IS NOT ALWAYS A CIRCLE.** A área de clique é quadrada e a
superfície só aparece no hover. O círculo existe quando a semântica pede
(`shape="circle"`), não como decoração padrão.

### Densidade

| Densidade     | Altura | Onde                                            |
| ------------- | ------ | ----------------------------------------------- |
| `compacta`    | 32px   | linha de tabela, barra de ferramentas           |
| `padrao`      | 36px   | **o padrão do ERP de mesa** — formulário e ação |
| `confortavel` | 44px   | formulário longo, toque                         |

Não use 44px em tudo: o Synapse é software de mesa, não interface mobile
ampliada.

### Exemplo

```tsx
<Field label="Nome" error={erros.nome} hint="Como aparece na busca">
  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
</Field>

<Field label="Limite" span={2}>
  <MoneyInput value={limite} onChange={(e) => setLimite(e.target.value)} />
</Field>

<Button variant="primary" loading={salvando}>Salvar</Button>
<Button variant="quiet">Cancelar</Button>

<Status tone={ativo ? 'ok' : 'neutro'}>{ativo ? 'Ativo' : 'Inativo'}</Status>
```

### Armadilha conhecida

`corpo` e `corpoGrande` renderizam `<p>`. Em contexto de linha — dentro de
`<button>`, de `<td>` ou de outro parágrafo — passe `as="span"`, senão o HTML
fica inválido.

## Data Row — a gramática de linha operacional

Formalizada nas Fases 4.2–4.4, depois de provada em três superfícies reais e
bem diferentes entre si: a Home (`Requer atenção`/`Acesso rápido`), a Lista de
Clientes (`<table>` simples) e a Fila de Análise de Crédito (`<table>` com
colunas reordenáveis/redimensionáveis pelo usuário, ordenação e seleção). Não
é um componente React — é um conjunto pequeno de decisões que se repetem.

### Planos: `tela` vs `pagina`

`Surface variant="tela"` é o chão do aplicativo (o `AppShell` já usa por
baixo do header/menubar); `variant="pagina"` é a folha de trabalho — sempre um
tom mais clara, nunca com borda ou sombra entre as duas. A diferença é
propositalmente pequena (perceptível por comparação lado a lado, não isolada)
e sobrevive mesmo com uma tabela densa por cima (testado na Fila).

### Colunas de uma linha de dado

Nem toda linha tem as seis, mas quando existem, seguem esta ordem e este
propósito — não force uma coluna que não tem correspondente real na tela:

| Papel     | Exemplo                              | Tratamento                                                |
| --------- | ------------------------------------ | --------------------------------------------------------- |
| leading   | código, índice                       | `font-data`, discreto, nunca a informação principal       |
| primary   | nome do cliente, número do pedido    | peso normal a semi-negrito, nunca cortado sem truncate    |
| secondary | cidade, razão social                 | tom de apoio (`text-ink-apoio`/`tone="apoio"`)            |
| data      | CNPJ/CPF, telefone, datas, valores   | `font-data` (liga `tnum`+`zero` — ver `font.data` abaixo) |
| status    | situação, tipo                       | `Status`, nunca pílula com cor solta                      |
| action    | um toggle de linha (ex.: "impresso") | controle real (`aria-pressed`), não decoração             |

### `font.data`: por que não trocamos de família

Avaliado na Fase 4.3 (Inter vs. Mona Sans vs. IBM Plex Sans, com arquivos
temporários, nunca commitados): Inter ganhou por já cobrir os requisitos
(zero cortado com a feature `zero`, `tnum` para não dançar a coluna, 1/l/I
distintos o bastante, sem custo de bundle). A assinatura de dado não vem de
trocar fonte — vem de ligar essas features OpenType consistentemente em todo
número, código e documento, e só ali.

### Estados de linha

Cinco estados, cada um com um sinal diferente — nunca dois deles com o mesmo
visual:

| Estado                       | Sinal                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| normal                       | nada                                                                                                 |
| hover                        | só muda o plano (`bg-surface-hover`) — nunca o mesmo sinal do selecionado                            |
| focus (teclado, sem seleção) | anel discreto de acessibilidade (`ring-primary/40 ring-inset`)                                       |
| selected/current             | **Synapse Signal**: superfície neutra + traço de cobalto de 2px na borda esquerda — nunca fundo azul |
| selected + focus             | o traço de cobalto do selecionado, com o anel de foco por cima — nunca as duas coisas competindo     |

O Synapse Signal é a mesma gramática em quatro lugares hoje: o indicador de
módulo ativo da Menubar (um segmento curto, não um sublinhado inteiro), a
linha selecionada da Command Window, a linha em foco da Lista de Clientes e a
linha selecionada da Fila de Crédito. É sempre um traço curto — nunca uma
caixa cheia, nunca `border-left` sozinho sem a superfície acompanhando.

### Hairline com inset — e onde ela NÃO se aplica

Na Home e na Lista de Clientes, o divisor entre linhas começa depois da
coluna `leading` (o código/índice fica com um "entalhe" próprio). Esse padrão
depende de uma coluna `leading` **fixa** — na Fila de Crédito, onde o usuário
pode reordenar livremente todas as colunas, não há uma coluna "leading"
estável para ancorar o entalhe, e forçá-lo na posição visualmente-primeira-de-
-momento criaria uma linha que pula de lugar a cada reordenação. Ali a
hairline continua de ponta a ponta — decisão deliberada, não uma pendência.

## DataGrid — a fundação (Fase 5)

A Fase 5 auditou as ~21 tabelas do web-erp, comparou engine própria vs
TanStack Table vs alternativas, e decidiu **não adicionar dependência**: a
fila de crédito já tinha, escrita e comprovada, praticamente toda a lógica
que uma engine própria precisaria (ciclo de ordenação, ordem/largura/
visibilidade de coluna persistidas por usuário via `lib/preferencias.ts`,
navegação por teclado) — adotar uma biblioteca significaria reescrever essa
lógica sobre uma API nova, pelo custo de bundle, sem ganhar capacidade real.
O `packages/sdl/src/datagrid/` de hoje é o primeiro recorte dessa fundação:
cobre o caso comum (célula, cabeçalho, estado de linha), não o avançado.

### O que existe

| Peça                                     | O que faz                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataGridCelula`                         | `<td>` com papel de coluna (`leading`/`primary`/`secondary`/`data`/`status`/`meta`/`action`), `font-data` automático no papel `data`, hairline-inset opcional |
| `DataGridCabecalho`                      | `<th>` congelado (sentence case, sem uppercase/tracking), indicador de ordenação discreto quando `aoOrdenar` é passado                                        |
| `classesDaLinha`                         | as 5 classes de estado de linha da Data Row v1, numa função só                                                                                                |
| `SynapseSignal`                          | o traço de 2px — `gatilho="controlado"` (seleção) ou `"foco-do-grupo"` (tabelas sem seleção)                                                                  |
| `proximaOrdenacao` / `useOrdenacaoLocal` | o ciclo asc/desc/nova-coluna, extraído da fila                                                                                                                |

Nenhuma dessas peças importa biblioteca de ícone ou qualquer dependência nova
— quem consome injeta o que precisar (ex.: `iconeAscendente`/`iconeDescendente`
em `DataGridCabecalho`).

### O que ainda não existe

Resize, reorder de coluna, seletor de visibilidade e navegação por teclado
continuam vivendo só na Fila de Crédito (`credit/fila/*`), que é hoje a única
tela com essas capacidades. Extrair isso para a fundação exige uma **segunda**
tela que precise da mesma coisa — uma capacidade provada em um único lugar
ainda é código daquele lugar, não uma abstração. Virtualização não foi
implementada: nenhuma tela real hoje renderiza mais que ~200 linhas de uma
vez (a fila tem um teto de 200; Clientes pagina 50 por cursor).

### Pontos de extensão

`PapelDeColuna` é o encaixe para capacidades futuras (uma coluna `action`
saberá renderizar um menu de linha sem a fundação conhecer regra de negócio).
Persistência de estado de coluna (ordem/largura/visibilidade) deve ser
injetada pelo consumidor — a fundação não conhece `currentUid()` nem
`localStorage`, isso é decisão do app, como já é em `usePreferenciasDaFila`.

### Fase 5.1 — dois consumidores novos, o que mudou e o que não mudou

`StockIntelligenceScreen` (migrando o `components/DataTable.tsx` legado, hoje
removido) e `HistoricoDoBalcao` (dentro de um `Modal` do `@synapse/ui`)
prometidos como prova real da fundação fora da Fila e de Clientes.

**Mudou (comprovado por uso real, não por preferência):**

- `DataGridCabecalho` agora anuncia `aria-sort="none"` em colunas ordenáveis
  que não são a ativa — antes o atributo era só omitido. Só apareceu como
  problema real quando uma tabela com 6 colunas ordenáveis existiu (a fila só
  tem uma "atual" cada vez, então nunca expôs essa lacuna).
- `DataGridCelula` ganhou `truncar` (default `true`): a fila tem colunas de
  largura fixa (`table-fixed`), então cortar em reticências sempre fez
  sentido; Clientes e Inteligência de Estoque não têm largura fixa, e forçar
  `truncate whitespace-nowrap` ali mudaria como o texto quebra. `truncar` não
  existia até Clientes expor a diferença — StockIntelligence só confirmou que
  era a decisão certa.
- `CelulaDeDinheiro` (em `apps/web-erp/src/components/datagrid/`, não no SDL)
  teve seu segundo consumidor real (`HistoricoDoBalcao`) sem precisar de
  nenhuma mudança — sinal de que a peça já estava certa desde Clientes.

**Não mudou (testado e decidido não extrair):**

- **Visibilidade de coluna.** Agora existem dois consumidores reais (Fila e
  StockIntelligence), o que a tornaria uma candidata segundo a regra de "dois
  consumidores". Mas os _shapes_ são genuinamente diferentes: a Fila guarda
  visibilidade **junto** com ordem e persiste tudo por `uid`
  (`usePreferenciasDaFila`); StockIntelligence usa um `Set` efêmero, sem
  persistência, sem conceito de ordem. Unificar agora forçaria uma das duas a
  herdar uma semântica que não tinha (persistência que StockIntelligence
  nunca teve, ou desacoplar ordem de visibilidade na Fila, que sempre as
  tratou juntas). Ficou local nos dois — a próxima tela com visibilidade é
  quem decide se o formato comum finalmente aparece.
- **Ordenação de 3 estados.** StockIntelligence tem um "nenhuma ordenação"
  que a Fila nunca teve (lá sempre existe uma coluna ordenada, com padrão de
  fábrica). `proximaOrdenacao` da fundação continua com o ciclo de 2 estados
  da Fila; o ciclo de 3 estados ficou local
  (`stock-intelligence/colunas.ts`) — forçar os dois no mesmo utilitário
  apagaria um comportamento real que a tela já tinha antes da migração.

## Ações de linha — o que é gramática comum e o que não é (Fase 5.3)

`BoletosScreen` foi a primeira tela a precisar de **ações condicionais por
status** dentro da célula `papel="action"` (segunda via / baixa manual /
cancelar, cada uma aparecendo ou não conforme o `ChargeStatus` da parcela).
Antes de generalizar qualquer coisa, comparamos as 4 telas que já têm algo em
`papel="action"`:

| Tela                   | Forma da ação                                               | Condicional a quê?                              |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| `BoletosScreen`        | 1 a 3 botões, cada um pode sumir                            | status do negócio (5 valores)                   |
| `HistoricoDoBalcao`    | 2 botões fixos (`BotaoDeAcao` com ícone), sempre presentes  | nada — sempre os mesmos                         |
| `StockIntelligence`    | 1 botão de disclosure (expandir/recolher)                   | estado local de UI, não é ação sobre o dado     |
| `TabelaAuxiliarScreen` | par de botões que trocam de rótulo/função em modo de edição | modo (visualizar vs editar), não status do dado |

Os quatro _shapes_ são genuinamente diferentes — um é uma máquina de estado de
domínio (Boletos), um é fixo, um é um disclosure de UI, um é uma troca de
modo. Forçar um `RowActions`/`ActionMenu` comum agora obrigaria pelo menos
três desses quatro a herdar uma semântica de "lista de ações condicionais"
que não têm. Por isso **nenhum componente novo foi criado** — a decisão é a
mesma tomada em Fase 5.1 para visibilidade de coluna: sem um terceiro
consumidor com a mesma forma, abstrair é inventar.

O que **é** comum, e vale registrar como princípio (não como componente):

- Toda ação de linha mora em `DataGridCelula papel="action"`, nunca fora dela.
- Toda ação usa `Button variant="quiet" density="compacta"` — nenhuma tela
  usa botão preenchido (`variant="primary"`) dentro de uma linha de dado; um
  botão preenchido "domina" a linha e disputa atenção com o dado.
- Diferenciação de hierarquia (primária/destrutiva) é feita **por cor do
  texto**, não por peso visual: `className="text-primary"` para a ação que
  avança o fluxo, `className="text-status-perigo hover:bg-status-perigo-fundo"`
  para a destrutiva. A cor de perigo só ganha fundo no hover/foco — nunca em
  repouso.
- Confirmação de ações destrutivas usa o mecanismo que a tela já tinha
  (`window.confirm` em Boletos); a migração para o DataGrid nunca introduziu
  nem removeu uma confirmação.
- A regra de **quais** ações aparecem em cada status é responsabilidade da
  tela (`regrasDoBoleto.ts`, funções puras `podeBaixarManualmente`/
  `podeCancelar`), nunca do SDL — o DataGrid não sabe o que "boleto vencido"
  significa, só sabe renderizar uma célula com papel `action`.

### `DfeScreen` — quando a resposta certa é não migrar (Fase 5.3)

A tabela de conferência de itens do DF-e (`DfeItemsTable`, em
`apps/web-erp/src/features/inbound/DfeScreen.tsx`) foi auditada e
propositalmente **não** migrada para a fundação de DataGrid. Cada célula da
tabela é um `<input>` editável (produto interno, quantidade, custo, lote,
validade) ligado à conferência item a item de uma nota fiscal — a primeira
tabela do inventário em que a linha inteira é um formulário, não uma
apresentação de dado. `DataGridCelula`/`classesDaLinha` foram desenhados e
provados só para células de **leitura** (texto via `Text variant="dado"`);
não existe um segundo consumidor com célula editável para provar que forma a
fundação precisaria ter para isso — migrar aqui seria inventar a capacidade
com um único caso, exatamente o que as Fases 5.1/5.2 decidiram não fazer com
visibilidade de coluna e ordenação de 3 estados.

O que foi feito, com risco zero, sem tocar a conferência: a situação de cada
nota (`PENDENTE`/`CONFERIDA`/`RECUSADA`/`LANCADA`, antes um selo cinza único
para os quatro valores) passou a usar `Status variant="chip"` com um tom por
situação, e a formatação de moeda passou a usar `formatarMoeda` em vez de um
`Intl.NumberFormat` duplicado local. A tabela editável, os botões "Concluir
conferência"/"Lançar entrada" e toda a regra fiscal continuam exatamente como
estavam.

## Fase 5.4 — fechamento da expansão inicial

A foundation não mudou nesta fase (zero linhas em `src/datagrid/`). Migraram
`credit/Tabela.tsx` (primitive da ficha com 8 consumidores, API preservada;
o divisor vertical entre colunas continua como decisão local da ficha), as
abas Documentos de Cliente/Fornecedor/Funcionário e a tabela "Comparativo
entre filiais" do Dashboard (só a tabela; a tela é assunto de Screens).

**Sem `DocumentsTable` genérico.** As três abas de documentos parecem iguais,
mas diferem em colunas (4/5/4/6), origem do dado (painel de crédito com
permissão `financeiro.visualizar` vs. fetch próprio), quantidade de tabelas
(3/3/1) e semântica de situação (dias de atraso calculados vs. string livre
da API). Nenhuma tem ação, anexo, download ou row-open. O que é comum já é a
foundation — uma quarta camada só esconderia as diferenças.

**Editable grid: dois consumidores reais, nenhuma implementação.**
`AbaNfceSeries` (séries NFC-e: input/select por célula, adicionar/remover
linha, sem save próprio — o dirty state e o salvar são do assistente) e a
conferência do `DfeScreen` (input por célula, commit pelo botão "Concluir
conferência") são duas grades editáveis de verdade. Isso autoriza uma
futura fase de **estudo** (edit mode, dirty, commit/cancel, validação, Tab/
Enter/Escape, foco, erro por linha, save assíncrono) — não um `<input>`
dentro de `DataGridCelula`.

### Inventário canônico (web-erp, 21 arquivos com `<table>`)

| Arquivo                                          | Categoria       | Classe do que sobra        |
| ------------------------------------------------ | --------------- | -------------------------- |
| `customers/TabelaDeClientes.tsx`                 | MIGRATED        | —                          |
| `stock-intelligence/TabelaDeInteligencia.tsx`    | MIGRATED        | —                          |
| `vendas/balcao/HistoricoDoBalcao.tsx`            | MIGRATED        | —                          |
| `funcionarios/TabelaDeFuncionarios.tsx`          | MIGRATED        | —                          |
| `fornecedores/TabelaDeFornecedores.tsx`          | MIGRATED        | —                          |
| `cadastros/tabelas/TabelaAuxiliarScreen.tsx`     | MIGRATED        | —                          |
| `inventory/StockScreen.tsx` (ExpiryTable)        | MIGRATED        | —                          |
| `finance/BoletosScreen.tsx`                      | MIGRATED        | —                          |
| `credit/Tabela.tsx`                              | MIGRATED        | —                          |
| `customers/abas/Documentos.tsx`                  | MIGRATED        | —                          |
| `fornecedores/abas/AbaDocumentos.tsx`            | MIGRATED        | —                          |
| `funcionarios/abas/AbaDocumentosERelatorios.tsx` | MIGRATED        | —                          |
| `dashboard/DashboardScreen.tsx`                  | MIGRATED        | tela: Screens              |
| `purchasing/PurchasingScreen.tsx`                | PARTIAL         | workflow/form              |
| `inbound/DfeScreen.tsx`                          | PARTIAL         | editable grid              |
| `credit/fila/TabelaDaFila.tsx`                   | GOLDEN          | —                          |
| `fiscal/assistente/etapas/AbaNfceSeries.tsx`     | BLOCKED         | editable grid              |
| `vendas/comum/GradeDeItens.tsx`                  | BLOCKED         | interativa avançada        |
| `vendas/pdv/VendasDoCaixa.tsx`                   | BLOCKED         | tabela simples, retida PDV |
| `inventory/InventoryScreen.tsx`                  | MOCK-DATA       | —                          |
| `vendas/impressao/FolhaDoPedido.tsx`             | OUT-OF-CATEGORY | impressão                  |

Fora do inventário do web-erp: `apps/web-admin/src/app/App.tsx` (tabela de
empresas do console administrativo, ainda em `@synapse/ui`).

## Form Grammar v1 — CANDIDATE (Fase 6)

Provada em dois pilotos (Purchasing e o formulário de Boletos). As peças
vivem em `apps/web-erp/src/components/formulario/` e só sobem para o SDL
quando uma terceira tela confirmar a forma. Nenhuma API nova no SDL.

| Peça     | Regra                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| rótulo   | sempre `Field` (label real, `htmlFor`); nunca placeholder como rótulo; linhas repetidas têm o rótulo visível uma vez e `aria-label` com o nº da linha |
| controle | `Input`/`NumberInput`/`Select`/`DocInput` do SDL, 36px; nada de `h-11`/`h-8` locais                                                                   |
| largura  | vem do dado (`codigo`/`curto`/`medio`/`longo`/`resto`, em `larguras.ts`), não de grade de 12 colunas; a linha quebra inteira em 1280                  |
| seção    | `Secao`: título + hairline, nunca caixa arredondada dentro de caixa                                                                                   |
| leitura  | `ValoresDeLeitura`: dado consultivo em texto, legível e copiável — nunca `input disabled`                                                             |
| ações    | `BarraDeAcoes` no fim da seção que a ação conclui; `primary` uma por seção, alternativas `quiet`/`secondary`, largura do próprio texto                |
| erro     | local: `Field error`; de envio: uma linha ao lado da ação (`role="alert"`) — nunca input vermelho + caixa + toast                                     |
| abas     | `Abas` (setas ←/→, `aria-controls`, sublinhado cobalto), herdadas do assistente fiscal                                                                |

Não é comum aos dois pilotos (fica local): o "status line" único de Boletos
(um só `message` serve emissão, segunda via e baixa, então ele mora entre o
formulário e a tabela) e as linhas repetidas de campo de Purchasing.

`MoneyInput` não foi usado de propósito: ele é `type="text"`, e os dois
pilotos convertem o digitado com `Number(...)`, que devolve `NaN` para
"12,50". Trocar o controle mudaria a regra de parse; fica como dívida
(precisa de um parser de moeda compartilhado antes).

## Overlays — taxonomia (Fase 6, revisada na 6.2/6.3)

| Tipo    | Para quê                                | Implementação real hoje                                                                                    |
| ------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Modal   | decisão curta e bloqueante              | `@synapse/ui` `Modal` (trap, Esc pelo topo da pilha, devolve foco); credit `Dialogo` (idem, Fase 6.2/6.3)  |
| Drawer  | contexto lateral sem perder a tela      | `@synapse/ui` `Drawer` (StockScreen); `GavetaDoCliente` ganhou trap/devolução de foco na Fase 6.2          |
| Janela  | espaço de trabalho persistente/complexo | `components/janela/Janela` (arrasto, resize, maximizar, geometria por usuário, `comFundo` opcional)        |
| Popover | escolha contextual pequena              | sem primitive; implementações locais (`BuscaDeMunicipio`, `CampoDeTabela`, ...) — contextuais de propósito |

**Pilha de sobreposições (Fase 6.3).** `packages/ui/src/components/overlay/pilha.ts`
é agora a única fonte de verdade de "quem está no topo" — `useOverlay`
(Modal/Drawer), `useEscParaFechar` (credit `Dialogo`/`GavetaDoCliente`) e
`Janela` registram-se nela. Antes, cada mecânica tinha (ou não) sua própria
contagem, e duas sobreposições reais empilhadas (`GavetaDoCliente` aberta e
um `Dialogo` de decisão por cima) fechavam as duas com um Esc só —
`stopPropagation` não impede outro listener no mesmo nó e mesma fase de
rodar. Corrigido registrando todo mundo na mesma pilha e só agindo quando
`estaNoTopoDaPilha` é verdadeiro — não com mais `stopPropagation`.

Dívida restante: `HistoricoDoBalcao`, `JanelaDeImpressao`, `MolduraDoPdv` e
`VendasDoCaixa` continuam sobre `Modal size="full" bare` (fora do escopo do
piloto de cadastros); ~9 decisões ainda usam `window.confirm` bruto em vez de
um Dialogo padronizado.

**Ficha de crédito.** O 7/5 da ficha ligava por breakpoint de VIEWPORT
(`lg:`), mas a ficha vive numa Janela de 72% da tela: tabelas de 650–920px
caíam em cartões de 312–527px (até 464px escondidos em 1280). Agora o layout
segue a largura da própria ficha (`useLargura`, o mesmo da janela de
análise): quatro quadrantes só quando cada um comporta a própria tabela
(≥1760px, janela maximizada em 1920); abaixo disso, as partes empilham na
largura inteira. A Janela passou a devolver o foco para quem a abriu.

## Window Foundation v1 — STABLE (Fase 6.3)

Quatro consumidores reais, mesma mecânica (`components/janela/Janela`),
conteúdo genuinamente diferente:

| Consumidor                         | `comFundo` | Chave de geometria            | Abas                         |
| ---------------------------------- | ---------- | ----------------------------- | ---------------------------- |
| Fila/Análise/Documentos de crédito | não        | `janela.analise-de-credito.*` | local (com contagem por aba) |
| Cadastro de Cliente                | sim        | `janela.cadastro-cliente`     | `Abas`/`PainelDeAba`         |
| Cadastro de Funcionário            | sim        | `janela.cadastro-funcionario` | `Abas`/`PainelDeAba`         |
| Cadastro de Fornecedor             | sim        | `janela.cadastro-fornecedor`  | `Abas`/`PainelDeAba`         |

Arrasto, resize (borda e canto), maximizar/restaurar, geometria por usuário,
responsividade interna pela largura da própria Janela (nunca viewport) e
devolução de foco — provados nos quatro. `comFundo` (workspace de edição
única vs. comparação lado a lado) é uma escolha por consumidor, não uma
divergência de mecânica. A pilha de sobreposições (acima) faz a Janela ceder
Esc/Tab para um Modal/Dialogo aberto dentro dela sem precisar saber que ele
existe. Critério de "não declarar por entusiasmo": são 3 domínios (crédito,
cadastros) e 4 telas, não 2 — por isso sai de CANDIDATE para STABLE agora, e
não antes.

## Migrando do que existe hoje

| Legado                                   | Vai virar                  | Quando            |
| ---------------------------------------- | -------------------------- | ----------------- |
| `features/customers/campos.tsx`          | `Field` + `Input`/`Select` | fase de cadastros |
| `features/cadastros/comum/CamposDaFicha` | adaptador fino sobre o SDL | fase de cadastros |
| `features/fiscal/assistente/campos.tsx`  | `Field` + controles        | fase fiscal       |
| `@synapse/ui` `Button`/`Input`/`Card`    | `Button`/`Input`/`Surface` | por tela          |
| `BOTAO_*`, `SELO`, `TOM` em `estilos.ts` | `Button` e `Status`        | por tela          |

Os componentes do `@synapse/ui` continuam funcionando e estão marcados como
`@deprecated`: nenhum import quebra, e o editor avisa quem for escrever código
novo. A remoção acontece quando o último consumidor migrar.

## O que **não** está aqui

Migração de telas, remoção dos HEX das features, consolidação da escala
tipográfica e escolha de uma família mono de verdade. Do DataGrid, o comum
existe (célula/cabeçalho/linha, ver seção acima); resize, reorder,
visibilidade de coluna e virtualização continuam fora daqui até uma segunda
tela precisar deles de verdade.
