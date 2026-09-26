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

| Primitive     | Para que serve                                 | Variantes                                                                                                          |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Text`        | a escala tipográfica, por papel                | tituloTela · tituloSecao · tituloCartao · corpoGrande · corpo · corpoSecundario · rotulo · legenda · dado · codigo |
| `Surface`     | o plano em que o conteúdo se apoia             | pagina · painel · elevada · afundada                                                                               |
| `Divider`     | separar por linha                              | horizontal · vertical                                                                                              |
| `Field`       | rótulo, controle, dica e erro amarrados        | densidade e `span` na grade                                                                                        |
| `Input`       | texto                                          | densidade · `align` · `invalid`                                                                                    |
| `Select`      | escolha, com `<select>` nativo                 | densidade · `invalid`                                                                                              |
| `NumberInput` | quantidade e percentual                        | herda Input                                                                                                        |
| `MoneyInput`  | valor em real (só apresentação)                | herda Input                                                                                                        |
| `DocInput`    | CPF, CNPJ, CEP, telefone (máscara vem de fora) | herda Input                                                                                                        |
| `Button`      | ação                                           | primary · secondary · quiet · danger                                                                               |
| `IconButton`  | ação de glifo, com nome acessível obrigatório  | quiet · secondary · `shape`                                                                                        |
| `Kbd`         | a tecla do atalho                              | —                                                                                                                  |
| `Status`      | situação                                       | dot · text · chip, nos 8 tons                                                                                      |
| `Spinner`     | espera                                         | decorativo ou anunciado                                                                                            |

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

Primitives de componente (Button, Field, DataGrid…), migração de telas,
remoção dos HEX das features, consolidação da escala tipográfica e escolha de
uma família mono de verdade. Tudo isso é das fases 2 em diante.
