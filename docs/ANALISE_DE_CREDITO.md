# Análise de crédito

Tela `/vendas/analise-de-credito` (web-erp) e módulo `apps/api/src/modules/credit`.
Princípio: o Synapse organiza as evidências e calcula o impacto; a decisão é de quem analisa.
Nada é inventado — o que o sistema não guarda aparece como "não disponível" ou "histórico insuficiente".

## Onde está cada regra

| Regra                                    | Arquivo                                                       | Usada por                          |
| ---------------------------------------- | ------------------------------------------------------------- | ---------------------------------- |
| Exposição financeira do pedido           | `packages/validation/src/rules/credito/exposicao.ts`          | API e tela                         |
| Simulação e calendário de parcelas       | `packages/validation/src/rules/credito/parcelas.ts`           | tela (e futura geração de títulos) |
| Motivos, impacto, lote e justificativa   | `packages/validation/src/rules/credito/politica.ts`           | API e tela                         |
| Situação de crédito do cliente           | `apps/api/src/modules/credit/entities/situacao-de-credito.ts` | API                                |
| Comportamento financeiro e comparações   | `apps/api/src/modules/credit/entities/comportamento.ts`       | API                                |
| Sinais para decisão                      | `apps/api/src/modules/credit/entities/sinais.ts`              | API                                |
| Rastro (eventos, decisões, visualização) | `apps/api/src/modules/credit/entities/historico.ts`           | API                                |
| Documentos (pedido, NF, título, boleto)  | `apps/api/src/modules/credit/entities/documentos.ts`          | API                                |

A tela não recalcula exposição, limite nem comportamento: recebe tudo pronto da API. As regras que
precisam rodar nos dois lados (seleção em lote, simulação) são as mesmas funções compartilhadas.

## Valor comercial ≠ exposição de crédito

| Natureza       | Quando                                                            | Exposição                        |
| -------------- | ----------------------------------------------------------------- | -------------------------------- |
| `SEM_COBRANCA` | bonificação, troca, amostra, devolução ou condição "sem cobrança" | 0                                |
| `IMEDIATA`     | PIX ou dinheiro com todos os vencimentos em 0 dias                | 0                                |
| `CARTAO`       | forma contém "cartão"                                             | 0 (o recebível é da operadora)   |
| `A_PRAZO`      | boleto, cheque, carteira, PIX a prazo, boleto à vista             | total − entrada                  |
| `CONSIGNACAO`  | tipo consignação                                                  | total − entrada (ver pendências) |

A entrada (`entradaCentavos`) nunca passa do total.

## Situação de crédito

- **Em aberto** = soma do saldo dos títulos a receber que não estão cancelados, renegociados nem quitados.
- **Aprovados não faturados** = exposição dos pedidos `APROVADO` sem nota — o crédito já foi dado, o título ainda não existe.
- **Comprometido** = em aberto + aprovados não faturados.
- **Disponível** = limite do cadastro − comprometido. Sem cadastro, limite e disponível são nulos.
- **Utilização** = comprometido ÷ limite (uma casa decimal; pode passar de 100%).
- **Inadimplência**: a regra `avaliarCredito` do financeiro, com tolerância de 2 dias (`POLITICA_PADRAO`).

## Motivos da análise

Violam a política (aprovar exige justificativa) só quando o pedido concede crédito:
`CLIENTE_BLOQUEADO` (cadastro `BLOCKED`), `TITULO_VENCIDO` acima da tolerância,
`SALDO_VENCIDO_ACIMA_DO_LIMITE`, `SEM_LIMITE_DE_CREDITO`, `LIMITE_EXCEDIDO`, `LIMITE_INSUFICIENTE`.

Alertas (informam, não impedem): título vencido dentro da tolerância, `CADASTRO_INCOMPLETO`,
`SEM_HISTORICO_DE_CREDITO`, `HISTORICO_INSUFICIENTE`. Sem nenhum motivo: `ANALISE_OBRIGATORIA`
(todo pedido passa pelo crédito).

Na entrada (`POST /credit-analysis/orders`) os motivos são gravados em `analiseNoEnvio` e no evento
`ANALISE_ACIONADA`. Pedido anterior a isso aparece como "chegou antes do registro automático".

## Comportamento

- Pontualidade é **por título**: vale a data da liquidação que zerou o saldo. Pago em duas vezes, uma antes e outra depois do vencimento, conta como atraso.
- `% no prazo` = (antecipados + no vencimento) ÷ liquidados.
- Atraso médio = média de `max(0, dias após o vencimento)` dos liquidados (pagamento em dia conta zero).
- Maior atraso = maior desses valores.
- Prazo médio histórico = média simples do prazo médio dos pedidos **a prazo** aprovados ou faturados.
- Ticket médio = valor das vendas aprovadas ou faturadas ÷ quantidade (bonificação e troca não contam).
- Janelas: 90 dias, 6 meses (182) e 12 meses (365).
- Histórico suficiente: 5 títulos liquidados (`CREDITO_MINIMO_DE_TITULOS`). Comparações exigem 3 pedidos (`CREDITO_MINIMO_DE_PEDIDOS`).
- Comparação com ticket e prazo só vale para `VENDA`.

## Parcelas

- Pedido não faturado: simulação a partir da data de hoje do usuário (a tela diz "Simulação calculada em DD/MM/AAAA"). A divisão dos centavos é a mesma do financeiro: sobra 1 centavo em cada parcela, da primeira em diante.
- Pedido faturado (situação `FATURADO` ou com nota): valem as datas gravadas nos títulos, que não mudam mais. Faturado sem título válido não volta a simular.

## Decisões e auditoria

- `POST /credit-analysis/orders/:id/decisao` com `APROVAR`, `APROVAR_EXCECAO` ou `REPROVAR`. A API reavalia a política dentro da transação (relendo os aprovados do cliente). Fora da política, `APROVAR` volta 422; exceção e reprovação sem justificativa (mínimo de 10 caracteres) voltam 400; pedido já decidido volta 409.
- `POST /credit-analysis/orders/liberar` aprova em lote do mais antigo para o mais recente; sem justificativa, os que ficam fora da política são recusados com o motivo.
- Cada decisão acrescenta um evento (`LIBERADO`, `LIBERADO_EXCECAO`, `REPROVADO`) com autor, horário, motivos, justificativa e os números antes/depois. A decisão individual também vai para `auditLogs` (antes e depois do documento).
- `POST /credit-analysis/orders/:id/visualizacao` registra "visualizado" no máximo uma vez por pessoa a cada 30 minutos.
- Permissão: `financeiro.editar` para decidir. Não existe permissão específica de alçada para aprovação excepcional.

## Documentos (lupas)

`GET /credit-analysis/orders/:id/detalhe`, `GET /credit-analysis/orders/:id/nota` e
`GET /credit-analysis/titulos/:id`. Cada lupa abre um modal próprio (pedido, NF, título a receber,
título pago) numa janela de documentos com breadcrumb e Voltar.

## Lacunas e decisões pendentes

1. Nenhum fluxo da API fatura pedido, emite NF vinculada ou gera títulos a partir do pedido — hoje isso só existe no seed de desenvolvimento. Os documentos fiscais vivem em memória, sem vínculo com o pedido: não há status fiscal, XML, DANFE nem eventos fiscais.
2. Boleto é registrado por API do banco; não existe remessa/retorno CNAB nem tabela de ocorrências.
3. A liquidação não separa juros, multa e desconto, e o sistema recusa receber acima do saldo.
4. Não há código de representante nem política de prazo máximo, alçada por valor ou condição autorizada.
5. **Decisão pendente**: consignação é tratada como exposição integral até existir política.
6. **Decisão pendente**: cartão é tratado como exposição zero (risco da operadora).
7. **Decisão pendente**: aprovação excepcional usa `financeiro.editar`; se houver alçada, falta criar a permissão (é decisão de produto, a lista é fechada).
8. Reprovar não devolve o pedido ao vendedor para ajuste: esse fluxo não existe no app do vendedor.
