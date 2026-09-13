# Análise de crédito

Tela `/vendas/analise-de-credito` (web-erp) e módulo `apps/api/src/modules/credit`.
Princípio: o Synapse organiza as evidências e calcula o impacto; a decisão é de quem analisa.
Nada é inventado — o que o sistema não guarda aparece como "não disponível" ou "histórico insuficiente".

## Onde está cada regra

| Regra                                    | Arquivo                                                                  | Usada por                          |
| ---------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| Classificação da operação (é venda?)     | `packages/validation/src/rules/credito/operacao.ts`                      | API e tela                         |
| Exposição financeira do pedido           | `packages/validation/src/rules/credito/exposicao.ts`                     | API e tela                         |
| Simulação e calendário de parcelas       | `packages/validation/src/rules/credito/parcelas.ts`                      | tela (e futura geração de títulos) |
| Motivos, impacto, lote e justificativa   | `packages/validation/src/rules/credito/politica.ts`                      | API e tela                         |
| Situação de crédito do cliente           | `apps/api/src/modules/credit/entities/situacao-de-credito.ts`            | API                                |
| Comportamento financeiro e comparações   | `apps/api/src/modules/credit/entities/comportamento.ts`                  | API                                |
| Sinais para decisão                      | `apps/api/src/modules/credit/entities/sinais.ts`                         | API                                |
| Rastro (eventos, decisões, visualização) | `apps/api/src/modules/credit/entities/historico.ts`                      | API                                |
| Permissões da decisão                    | `apps/api/src/modules/credit/services/permissoes-do-credito.ts`          | API (a tela recebe pronto)         |
| Trava de concorrência por cliente        | `apps/api/src/modules/credit/repositories/pedido-de-venda.repository.ts` | API                                |
| Documentos (pedido, NF, título, boleto)  | `apps/api/src/modules/credit/entities/documentos.ts`                     | API                                |

A tela não recalcula exposição, limite nem comportamento: recebe tudo pronto da API. As regras que
precisam rodar nos dois lados (seleção em lote, simulação) são as mesmas funções compartilhadas.

## Valor comercial ≠ exposição de crédito

Exposição é quanto do limite do cliente a operação compromete. Por forma de pagamento:

| Forma / operação                                                  | Natureza       | Exposição                  | Premissa                                                                                |
| ----------------------------------------------------------------- | -------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| PIX à vista (todos os vencimentos em 0)                           | `IMEDIATA`     | 0                          | Não há prazo concedido. O pedido **não registra** se o PIX foi recebido.                |
| Dinheiro à vista                                                  | `IMEDIATA`     | 0                          | Idem: não há registro de recebimento no pedido.                                         |
| Cartão (forma contém "cartão")                                    | `CARTAO`       | 0                          | O recebível é contra a operadora. O pedido **não registra** a autorização da transação. |
| Boleto (inclusive "à vista")                                      | `A_PRAZO`      | total − entrada            | O cliente recebe e paga depois: é crédito concedido.                                    |
| Cheque, carteira, PIX a prazo                                     | `A_PRAZO`      | total − entrada            | Idem.                                                                                   |
| Entrada (`entradaCentavos`)                                       | —              | reduz a exposição          | Nunca passa do total; o que foi pago antes do faturamento não compromete limite.        |
| Consignação (tipo `CONSIGNACAO`)                                  | `CONSIGNACAO`  | total − entrada (integral) | Regra conservadora e provisória, ver abaixo.                                            |
| Bonificação, troca, amostra, devolução ou condição "sem cobrança" | `SEM_COBRANCA` | 0                          | Não gera título a receber.                                                              |

### Não consumir limite ≠ pagamento confirmado

Exposição zero quer dizer **"não compromete limite"**, e só isso. O Synapse não guarda, no pedido, o
recebimento do PIX nem a autorização do cartão — então nenhum texto da análise afirma "pagamento
confirmado", "pagamento recebido" ou "pedido já está pago". O que a tela diz:

- Impacto: "Esta operação não compromete limite de crédito." com a explicação da natureza, em tom
  neutro (sem ícone de "seguro").
- Explicação do PIX/dinheiro: "O pedido não registra se o pagamento já foi recebido."
- Explicação do cartão: "O pedido não registra a autorização da transação."
- Sinais: "Pedido não compromete limite de crédito" (neutro) e, conforme a natureza, "O pedido não
  registra se o pagamento à vista já foi recebido" ou "O pedido não registra a autorização do cartão".

Testes de regressão (validation, API e tela) proíbem essas afirmações em qualquer cenário.

### Consignação

A mercadoria fica com o cliente sem título a receber. Até existir política própria, a regra é
**conservadora e provisória**: o valor integral (menos entrada) compromete o limite até o acerto.
O domínio separa a origem do risco em `ExposicaoDoPedido`:

- `exposicaoCreditoCentavos` — crédito concedido (a prazo);
- `exposicaoConsignacaoCentavos` — mercadoria consignada;
- `exposicaoCentavos` — o total consolidado (sempre crédito + consignação), que é o que entra no
  comprometido e nos motivos.

A tela continua mostrando o total; a separação existe para a política futura não precisar mudar o
contrato.

### Cartão

Não existe no Synapse estado de autorização, captura, recusa ou cancelamento da transação de cartão —
o pedido só tem a forma escolhida pelo vendedor, em texto. A regra parte da premissa de que a venda
no cartão será autorizada e mantém exposição zero. Chargeback está fora do escopo.

## Classificação da operação

`operacao.ts` é o único lugar que responde "isto é venda?": `classeDaOperacao(tipo)` devolve
`VENDA`, `SEM_COBRANCA` (bonificação, troca, amostra, devolução) ou `CONSIGNACAO`, e
`ehVendaEfetiva(tipo)` é verdadeiro só para `VENDA`. Usam essa função: a exposição, as métricas de
compra (ticket médio, volume, prazo médio de venda, última compra), a comparação com o habitual e o
atalho "Não é venda" da fila. Nada é apagado do histórico — as outras operações continuam na lista de
pedidos do cliente, só não entram em métrica de venda.

## Situação de crédito

- **Em aberto** = soma do saldo dos títulos a receber que não estão cancelados, renegociados nem quitados.
- **Aprovados não faturados** = exposição dos pedidos `APROVADO`, sem nota e **sem título gerado**
  (título não cancelado com `orderId` do pedido).
- **Comprometido** = em aberto + aprovados não faturados.
- **Disponível** = limite do cadastro − comprometido. Sem cadastro, limite e disponível são nulos.
- **Utilização** = comprometido ÷ limite (uma casa decimal; pode passar de 100%).
- **Inadimplência**: a regra `avaliarCredito` do financeiro, com tolerância de 2 dias (`POLITICA_PADRAO`).

Ciclo do pedido no limite:

1. **Em análise** (`AGUARDANDO_ANALISE`): não compromete nada. Cada pedido é avaliado sozinho contra o
   comprometido atual.
2. **Aprovado, não faturado**: compromete a exposição. O próximo pedido do cliente já é avaliado com
   esse saldo.
3. **Título gerado**: o valor passa a contar pelo saldo do título e o pedido sai da soma — mesmo que a
   situação do pedido ainda não tenha virado `FATURADO`. Um aprovado de R$ 5.000 conta R$ 5.000 antes
   e depois do título; nunca R$ 10.000.
4. **Faturado**: conta só pelos títulos; cada pagamento abate o saldo.

## Motivos da análise

Violam a política (aprovar exige aprovação excepcional com justificativa) só quando o pedido concede
crédito: `CLIENTE_BLOQUEADO` (cadastro `BLOCKED`), `TITULO_VENCIDO` acima da tolerância,
`SALDO_VENCIDO_ACIMA_DO_LIMITE`, `SEM_LIMITE_DE_CREDITO`, `LIMITE_EXCEDIDO`, `LIMITE_INSUFICIENTE`.

Alertas (informam, não impedem): título vencido dentro da tolerância, `CADASTRO_INCOMPLETO`,
`SEM_HISTORICO_DE_CREDITO` ("Sem histórico de crédito"), `HISTORICO_INSUFICIENTE`. Sem nenhum motivo:
`ANALISE_OBRIGATORIA` (todo pedido passa pelo crédito).

Na entrada (`POST /credit-analysis/orders`) os motivos são gravados em `analiseNoEnvio` e no evento
`ANALISE_ACIONADA`. Pedido anterior a isso aparece como "chegou antes do registro automático".

## Comportamento

- Pontualidade é **por título**: vale a data da liquidação que zerou o saldo. Pago em duas vezes, uma antes e outra depois do vencimento, conta como atraso.
- `% no prazo` = (antecipados + no vencimento) ÷ liquidados.
- Atraso médio = média de `max(0, dias após o vencimento)` dos liquidados (pagamento em dia conta zero).
- Maior atraso = maior desses valores.
- Prazo médio histórico = média simples do prazo médio das **vendas a prazo** aprovadas ou faturadas.
- Ticket médio = valor das vendas aprovadas ou faturadas ÷ quantidade. Só venda efetiva: bonificação,
  troca, amostra, devolução e consignação não entram.
- Janelas: 90 dias, 6 meses (182) e 12 meses (365).

### Histórico insuficiente

- Limiar: **5 títulos liquidados** (`CREDITO_MINIMO_DE_TITULOS`, configurável por ambiente; valor
  inválido volta para 5). De 0 a 4 liquidados o histórico é insuficiente; com 5, suficiente.
- Abaixo do limiar a linguagem é neutra: "2 títulos liquidados — histórico ainda insuficiente (o
  mínimo é 5)" no motivo e "Histórico insuficiente: 2 títulos liquidados (o mínimo é 5)" no sinal.
  O sinal de pontualidade ("8 dos últimos 8…") só aparece com histórico suficiente.
- Sem nenhum título: "Sem títulos anteriores: não há histórico de pagamento a prazo".

### Comparação com ticket e prazo

- Exige **3 pedidos** (`CREDITO_MINIMO_DE_PEDIDOS`) na janela; abaixo disso a tela diz "Histórico
  insuficiente: N compra(s)…".
- Só vale para venda efetiva.
- É **só informativa**: nunca gera motivo, bloqueio nem exigência de aprovação excepcional. No
  máximo aparece como sinal de atenção ("Pedido 92% acima do ticket médio de 90 dias").

## Sinais

Regra fixa, determinística e com a fonte do dado em cada sinal. Exemplos do que aparece: "Nenhum
título vencido atualmente", "Pedido não compromete limite de crédito", "Histórico insuficiente: 2
títulos liquidados (o mínimo é 5)", "Após aprovação, utilização do limite ficará em 82%". Nunca: "Cliente
sem risco", "Bom histórico", "Bom pagador", "Pedido já está pago", "Pagamento confirmado" — um teste
percorre PIX, dinheiro, cartão, troca, consignação e boleto, com e sem histórico, e recusa esses textos.

## Parcelas

- Pedido não faturado: simulação a partir da data de hoje do usuário (a tela diz "Simulação calculada em DD/MM/AAAA"). A divisão dos centavos é a mesma do financeiro: sobra 1 centavo em cada parcela, da primeira em diante.
- Pedido faturado (situação `FATURADO` ou com nota): valem as datas gravadas nos títulos, que não mudam mais. Faturado sem título válido não volta a simular.

## Permissões

| Permissão                           | O que permite                                   | Roles padrão                                                       |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `financeiro.visualizar`             | ver a fila, a ficha e os documentos             | SUPER_ADMIN_SAAS, ADMIN_EMPRESA, ADMIN_FILIAL, GERENTE, FINANCEIRO |
| `financeiro.editar`                 | decidir: aprovar dentro da política e reprovar  | SUPER_ADMIN_SAAS, ADMIN_EMPRESA, FINANCEIRO                        |
| `financeiro.credito.aprovarExcecao` | aprovar **fora** da política, com justificativa | SUPER_ADMIN_SAAS, ADMIN_EMPRESA                                    |

- A permissão de exceção segue a convenção do catálogo (`modulo.subdominio.operacao`, como
  `estoque.inteligencia.ajustar`). É binária: não há alçada por valor.
- **Não** vem com `financeiro.editar`: o FINANCEIRO aprova dentro da política, mas não aprova exceção.
  Quem precisar recebe um cargo personalizado com as duas permissões (a rota exige
  `financeiro.editar` antes de tudo; a exceção sozinha não abre a rota).
- Limitação: cargos personalizados ainda vivem em memória na API (`RoleRepository`) e somem no
  restart. Enquanto isso, na prática, só as roles administrativas aprovam exceção de forma estável.

Onde é conferida:

- `POST /credit-analysis/orders/:id/decisao`: sem `financeiro.editar`, 403 (PermissionInterceptor).
  `APROVAR_EXCECAO` sem a permissão de exceção, 403 — antes da justificativa. Com a permissão e sem
  justificativa (mínimo de 10 caracteres), 400. `APROVAR` fora da política, 422 (a mensagem diz se
  falta a permissão). Pedido já decidido, 409.
- `POST /credit-analysis/orders/liberar`: o lote nunca libera item fora da política para quem não tem
  a permissão de exceção, mesmo com justificativa — o item fica em `recusados` com o motivo.
- `GET /credit-analysis/customers/:id` devolve `permissoes: { decidir, aprovarExcecao }`. A tela usa
  isso para desabilitar o botão **antes** do clique e escrever "Esta operação exige aprovação
  excepcional. Você não possui permissão para essa decisão." — na análise do pedido e no lote da
  ficha (que sugere desmarcar os pedidos fora da política). A API confere de novo em cada chamada.

## Decisões e auditoria

- `POST /credit-analysis/orders/:id/decisao` com `APROVAR`, `APROVAR_EXCECAO` ou `REPROVAR`. A API reavalia a política dentro da transação.
- `POST /credit-analysis/orders/liberar` aprova em lote do mais antigo para o mais recente.
- Cada decisão acrescenta um evento (`LIBERADO`, `LIBERADO_EXCECAO`, `REPROVADO`) no histórico do
  pedido, append-only, com: autor (`porUid`, `porNome`), horário (`em`), cliente (`cliente.id`,
  `cliente.nome`), motivos da hora (`motivos`), os que feriam a política (`motivosForaDaPolitica`),
  justificativa e os números **congelados na hora**: valor comercial, exposição, limite,
  comprometido antes/depois, disponível antes/depois e utilização antes/depois. Nada disso é
  recalculado depois: pagar um título no dia seguinte muda a ficha, não o evento.
- A decisão individual também vai para `auditLogs` (antes e depois do documento).
- `POST /credit-analysis/orders/:id/visualizacao` registra "visualizado" no máximo uma vez por pessoa a cada 30 minutos.

## Concorrência

Duas camadas, as duas dentro da transação do Firestore que grava a decisão:

1. **Trava por cliente** — `tenants/{tenant}/travasDeCredito/{customerId}` (`versao`,
   `ultimoPedidoId`, `atualizadoEm`). Toda decisão (individual ou lote) lê e grava esse documento. Dois
   analistas aprovando pedidos diferentes do mesmo cliente disputam o mesmo documento: o Firestore
   confirma um e faz o outro recomeçar, e a nova tentativa relê os aprovados já com o primeiro
   gravado.
2. **Releitura dos aprovados na transação** — a consulta dos pedidos `APROVADO` do cliente é feita com
   `transacao.get(query)`.

Mesmo pedido decidido por duas pessoas: as duas transações gravam o mesmo documento; a que recomeça
encontra o pedido já decidido e devolve 409, sem gravar evento. Nunca há dois eventos de decisão.

Testes reais, contra o emulador do Firestore (`pnpm test:credito:emulador`,
`apps/api/src/modules/credit/services/concorrencia.emulador.spec.ts`): limite 10.000, comprometido
2.000, pedidos A e B de 6.000 aprovados em paralelo → exatamente um 200 e um 422; corrida com quatro
analistas → uma aprovação só; mesmo pedido aprovado e reprovado em paralelo → uma vence, a outra 409,
um evento; sequência análise → aprovação → próximo pedido; transição para título sem contagem dupla;
números da auditoria congelados. Verificado por mutação: sem as duas camadas os testes de corrida
falham; só com a trava, passam.

O `pnpm test` comum não depende do emulador (o arquivo fica de fora sem `FIRESTORE_EMULATOR_HOST`).
Os títulos são lidos fora da trava — o fluxo que cria título a partir do pedido ainda não existe na API.

## Documentos (lupas)

`GET /credit-analysis/orders/:id/detalhe`, `GET /credit-analysis/orders/:id/nota` e
`GET /credit-analysis/titulos/:id`. Cada lupa abre um modal próprio (pedido, NF, título a receber,
título pago) numa janela de documentos com breadcrumb e Voltar.

## Desenvolvimento

`scripts/seed-dev.mjs` (só emulador) cria, além de `teste.rbac@synapse.dev` (ADMIN_EMPRESA),
`financeiro.teste@synapse.dev` (FINANCEIRO) e `vendedor.teste@synapse.dev` (VENDEDOR), com a mesma
senha, para testar as permissões na tela.

## Lacunas e decisões pendentes

1. Nenhum fluxo da API fatura pedido, emite NF vinculada ou gera títulos a partir do pedido — hoje isso só existe no seed de desenvolvimento. Quando existir, precisa gravar `orderId` nos títulos (é o que tira o pedido aprovado da soma) e passar pela trava do cliente. Os documentos fiscais vivem em memória, sem vínculo com o pedido: não há status fiscal, XML, DANFE nem eventos fiscais.
2. Boleto é registrado por API do banco; não existe remessa/retorno CNAB nem tabela de ocorrências.
3. A liquidação não separa juros, multa e desconto, e o sistema recusa receber acima do saldo.
4. Não há código de representante nem política de prazo máximo, alçada por valor ou condição autorizada.
5. **Decisão pendente**: consignação conta como exposição integral (regra conservadora e provisória). O domínio já separa `exposicaoConsignacaoCentavos` para uma política própria.
6. **Decisão pendente**: cartão conta como exposição zero, na premissa de autorização; o Synapse não registra autorização, captura nem chargeback.
7. PIX e dinheiro à vista: o pedido não registra recebimento. Se um dia registrar, a tela pode mostrar "recebido" com a evidência; até lá, não mostra.
8. Cargos personalizados (quem aprova exceção além das roles administrativas) vivem em memória na API.
9. Reprovar não devolve o pedido ao vendedor para ajuste: esse fluxo não existe no app do vendedor.
