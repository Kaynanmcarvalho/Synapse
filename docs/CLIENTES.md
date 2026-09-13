# Cadastro de clientes

Tela `/cadastros/clientes` (menu **Cadastros › Clientes › Clientes**), API `catalog/customers` e
documento `tenants/{tenant}/customers/{id}` no Firestore.

## Um cliente, um documento

Antes havia duas verdades sobre o mesmo cliente: o catálogo guardava cliente num `Map` em memória
(que sumia no restart e não enxergava o cliente da análise de crédito) e a análise de crédito lia e
gravava o documento do Firestore. Agora existe um cadastro só, e todo mundo lê dele:

| Quem                       | Como usa o cadastro                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Tela de clientes           | cria, altera, lista e busca                                                                                            |
| Análise de crédito         | limite, situação, dias para bloqueio, autorização de pagamento — só leitura; "Cadastro do cliente" abre a mesma janela |
| Busca global (Ctrl+K)      | procura por nome, razão social, CNPJ/CPF, código, telefone e cidade                                                    |
| PDV                        | escolhe o cliente da venda pela mesma busca                                                                            |
| Carteira do vendedor       | clientes em que ele é vendedor (1) ou (2)                                                                              |
| LGPD (exportar/anonimizar) | lê e anonimiza o mesmo documento                                                                                       |

O único lugar que grava cliente é `catalog/repositories/cliente.repository.ts`. A análise de crédito
usa um adaptador de leitura (`credit/repositories/cliente.repository.ts`).

## A janela e as abas

As sete abas do Syndata, no desenho do Synapse. Atalhos iguais aos do sistema antigo: **F2** salva,
**F3** desfaz o que foi digitado, **Esc** sai (pergunta antes se houver alteração não salva).

| Aba                | O que guarda                                                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Principal          | identificação, endereço, contatos, dados fiscais, vendedores, grupo/sub-grupo/praça, crédito e situação                                                                                   |
| Pessoa Jurídica    | contato e comprador, sócios com CPF, contabilista, abertura, ramo, segmento, substituto tributário, revendedor, órgão público, Suframa, TARE (FOMENTAR/PRODUZIR). Some para pessoa física |
| Ref. Comerciais    | quem já vende para o cliente e o que respondeu; cada referência guarda quem anotou e quando                                                                                               |
| Controle de Vendas | condição e forma de pagamento padrão, desconto máximo                                                                                                                                     |
| Outras Informações | anotação interna e o registro da ficha (código, quem cadastrou, quem alterou, versão)                                                                                                     |
| Documentos         | notas fiscais, títulos em aberto e títulos pagos do cliente — vêm do sistema, nada é digitado                                                                                             |
| Relatórios         | resumo de crédito de hoje e atalhos para a análise de crédito do cliente                                                                                                                  |

A tela valida com o **mesmo schema da API** (`packages/validation/src/schemas/cliente.schema.ts`). O
aviso aparece embaixo do campo, a aba com erro ganha um ponto vermelho e o salvar abre a primeira aba
com problema.

## O que tem efeito no sistema

| Campo                             | Efeito                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Limite a prazo                    | limite da análise de crédito                                                                                                         |
| Situação (liberado / bloqueado)   | `financialStatus`. Bloqueado vira o motivo "Cliente bloqueado" na análise                                                            |
| Dias para bloqueio                | tolerância de atraso deste cliente na análise; vazio vale a geral (2 dias); zero bloqueia no primeiro dia                            |
| Autorização de pagamento          | "Somente à vista": pedido a prazo ganha o motivo `CLIENTE_SOMENTE_A_VISTA`, que fere a política e só passa por aprovação excepcional |
| Vendedor (1) e (2)                | carteira do vendedor                                                                                                                 |
| Nome, CNPJ/CPF, telefones, cidade | busca global e PDV                                                                                                                   |
| Classificação (ativo / inativo)   | filtro da lista                                                                                                                      |

Regras que não são óbvias:

- **Inadimplente não sai pelo cadastro.** A tela escolhe entre liberado e bloqueado; `OVERDUE` é o
  financeiro que aponta. Salvar a ficha de um cliente inadimplente mantém a inadimplência (e a tela
  avisa); bloquear de propósito continua valendo.
- **CPF/CNPJ é único por empresa**, conferido dentro da transação que grava — dois cadastros ao
  mesmo tempo com o mesmo documento: um passa, o outro recebe 409 com o código e o nome do dono.
- **Código sequencial** `C-0001`, gerado na transação da criação; nunca muda depois.
- Referência comercial já gravada mantém quem anotou e quando, mesmo editada por outra pessoa.
- Grupo, sub-grupo, praça, segmento e ramo são texto livre com **sugestão pelos valores já usados**
  (`GET catalog/customers/sugestoes`): o Synapse ainda não tem cadastro próprio desses agrupamentos.
- **Cadastro gravado antes desta tela** (pelo seed ou pela tela antiga da análise de crédito) pode não
  ter índice de busca, data de criação, versão, situação ou endereço. Nada precisa ser migrado à mão:
  - quem lê recebe o padrão da tela — ativo, liberado, saldo zero, endereço vazio;
  - a lista ordena por **nome**, que todo cadastro tem (ordenar por criação deixaria esses de fora);
  - a primeira busca sem resultado grava o índice em quem não tem (só o índice, e só se o documento
    não mudou desde a leitura) e marca o tenant em `contadores/customers-indice`; dali em diante, busca
    sem resultado custa uma leitura;
  - salvar a ficha pela tela completa versão e criação, com a autoria "Cadastro anterior (autor não
    registrado)" em vez de atribuir a criação a quem editou.

## API

| Rota                                           | Permissão           | O que faz                                                    |
| ---------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| `GET catalog/customers`                        | `cliente.gerenciar` | lista (`q`, `grupo`, `situacao`, `ativo`, `limit`, `cursor`) |
| `GET catalog/customers/sugestoes`              | `cliente.gerenciar` | valores já usados em grupo, praça, segmento e ramo           |
| `GET catalog/customers/:id`                    | `cliente.gerenciar` | a ficha inteira                                              |
| `POST catalog/customers`                       | `cliente.gerenciar` | cria (auditado)                                              |
| `PUT catalog/customers/:id`                    | `cliente.gerenciar` | altera (auditado)                                            |
| `PATCH catalog/customers/:id/financial-status` | `cliente.gerenciar` | bloqueia ou libera sem abrir a ficha (auditado)              |

As rotas antigas `catalog/partners/customers` saíram: o PDV passou a usar `catalog/customers`. A
`PUT credit-analysis/customers/:id/cadastro` também saiu — cadastro tem uma porta só de escrita.

Documentos e Relatórios leem `GET credit-analysis/customers/:id`, que exige `financeiro.visualizar`.
Sem essa permissão, as abas dizem isso em vez de ficar vazias. A lista de vendedores
(`GET field-sales/sellers`) exige `vendedor.gerenciar`; sem ela, o vendedor vira campo de texto.

`/vendas/analise-de-credito?cliente=<id>` abre a ficha do cliente direto — é para onde os atalhos
de Relatórios levam.

## Testes

- `packages/validation/src/schemas/cliente.schema.spec.ts` — o contrato.
- `apps/api/src/modules/catalog/services/cliente.service.spec.ts` — criar, alterar, lista, LGPD.
- `apps/api/src/modules/catalog/repositories/clientes.emulador.spec.ts` — no emulador do Firestore:
  código sequencial, documento único (inclusive em paralelo), busca por prefixo e documento, índice
  que acompanha a alteração, paginação, sugestões e cadastro antigo (sem índice, criação, versão ou
  endereço). Roda com `pnpm test:emulador`.
- `apps/web-erp/src/features/customers/formulario.test.ts` e `JanelaDoCliente.test.tsx` — máscaras,
  ida e volta do formulário, validação na tela, abas, atalhos e o que abre fora.

## Lacunas

1. Anexar arquivo ao cadastro (contrato, ficha assinada) ainda não existe.
2. Consulta de CEP e a "(F4) Consulta Sefaz" do Syndata não existem: o endereço e o CNPJ são digitados.
3. Condição de pagamento padrão, forma padrão e desconto máximo ficam registrados, mas o lançamento de
   pedido ainda não os aplica — a tela diz isso ao lado de cada campo.
4. A emissão de NF-e ainda não puxa o destinatário deste cadastro (indicador de IE, CRT, e-mail da
   NF-e e código IBGE ficam guardados para quando puxar).
5. Grupo, sub-grupo, praça, segmento e grupo econômico não têm cadastro próprio (são texto com sugestão).
6. Curva ABC por cliente, agendamentos, créditos do cliente e etiqueta não existem; a aba Relatórios
   lista isso com o motivo.
7. O histórico de atendimento (`catalog/partners/customers/:id/history`) continua em memória e nenhum
   fluxo grava nele; a exportação da LGPD o inclui vazio.
