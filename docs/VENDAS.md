# Vendas: Ponto de Vendas e PDV

Três telas do menu **Vendas**, no desenho do Syndata e do Nutri Prime:

| Menu                      | Tela                   | API                       | Onde grava                                               |
| ------------------------- | ---------------------- | ------------------------- | -------------------------------------------------------- |
| Venda Balcão (Alt+N)      | `/vendas/venda-balcao` | `vendas/balcao`           | `tenants/{t}/pedidosDeVenda/{id}` (origem `BALCAO`)      |
| Venda PDV Balcão (Ctrl+O) | `/vendas/pdv-balcao`   | `sales/pos` (modo BALCAO) | `tenants/{t}/caixas/{id}` e `tenants/{t}/vendasPdv/{id}` |
| Venda PDV NFC-e (Ctrl+D)  | `/vendas/pdv`          | `sales/pos` (modo NFCE)   | as mesmas, mais a NFC-e em `tenants/{t}/fiscalDocuments` |

Nada fica em memória: reiniciar a API não fecha caixa nem apaga venda. O número da venda do PDV sai
de `tenants/{t}/contadores/vendasPdv` em transação (dois caixas não imprimem o mesmo número); o
número do pedido do balcão é o mesmo contador dos pedidos da Análise de Crédito.

## O que a tela manda e o que a API decide

A tela manda **produto, quantidade e desconto**. Preço, descrição, unidade e peso vêm do catálogo e
da regra de preço (filial, cliente, quantidade) na API. Valor digitado abaixo do preço de tabela vira
desconto da linha; acima da tabela a tela recusa. O desconto do documento passa pelo limite do
vendedor (`comissao.descontoMaximoPercentual` do Cadastro de Funcionários) e a API confere de novo.

Vendedor é funcionário marcado como vendedor, sem bloqueio e sem demissão. Produto bloqueado, inativo
ou fora de linha não entra.

Quantidade em milésimos (1,5 kg = 1500) e dinheiro em centavos, na tela e na API.

## Ponto de Vendas (Venda Balcão)

Pedido (lupa abre o histórico), Cliente (F11), Vendedor, Produto/Serviço, Quantidade e Valor
Unitário. Enter anda produto → quantidade → valor → lança. Sem código, Enter abre a lista de
produtos. `3*código` lança três de uma vez.

| Tecla / botão    | Faz                                                                         |
| ---------------- | --------------------------------------------------------------------------- |
| Alterar / Enter  | traz o item escolhido para os campos; "Gravar item" substitui               |
| Excluir / Delete | tira o item                                                                 |
| Copiar           | duplica o item                                                              |
| Desc.            | desconto em % ou R$, no item ou no documento (repartido sem perder centavo) |
| Lote             | lote do item escolhido                                                      |
| Sugestão         | o que o cliente mais compra (pedidos anteriores)                            |
| Similar          | produtos da mesma categoria                                                 |
| **F3**           | Fechar Documento: tipo, forma e condição de pagamento, frete, acréscimo     |
| Ctrl+X           | Limpar Tela (com texto selecionado num campo, continua sendo recortar)      |
| F11 / F12        | Clientes / Produtos                                                         |
| Ctrl+H           | Histórico de Vendas: reimprime ou copia os itens com o preço de hoje        |
| F9               | Sair (a venda em andamento fica guardada neste navegador)                   |

Fechado o documento, o pedido entra na **Análise de Crédito** e abre a impressão.

## PDV (Balcão e NFC-e)

Abre pedindo o caixa: filial e fundo de troco. Um caixa aberto por operador por filial.

A **Venda PDV Balcão** abre numa janela grande por cima do sistema; **Esc** ou **Sair** volta para a
tela de onde veio sem perder nada — itens, cliente e mesa ficam guardados neste navegador e o caixa
continua aberto. A **Venda PDV NFC-e** usa a mesma tela, na página.

Produto/Serviço lê o código de barras e **já lança** com a quantidade do **(F2)**. Cliente começa
como CONSUMIDOR FINAL; **F10** escolhe do cadastro (traz o endereço) ou põe só o CPF/CNPJ na nota.

| Tecla  | Faz                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **F3** | Finalizar Venda: formas da tabela (Alt+1…Alt+9), valor de cada uma, falta e troco                                              |
| Ctrl+X | Limpar Venda                                                                                                                   |
| Ctrl+D | Cancelar Venda: escolhe a venda do caixa e o motivo (15+ letras); cancela a NFC-e, devolve estoque e tira o dinheiro da gaveta |
| F8     | Consultar NF: abre o DANFE da NFC-e                                                                                            |
| Ctrl+H | Histórico de Vendas do caixa: pedido, NFC-e, copiar itens                                                                      |
| F7     | Produto Pesável: código e peso, ou a etiqueta da balança                                                                       |
| Ctrl+A | Outros Recursos: suprimento, sangria, fechar caixa, reimprimir, impressora da gaveta, etiqueta                                 |
| Alt+N  | Mesa/Cartão (o Ctrl+N do Syndata o navegador não entrega para a página)                                                        |
| F4     | Acionar Gaveta                                                                                                                 |
| F12    | Produtos                                                                                                                       |

Só dinheiro dá troco; venda a prazo ou boleto exige cliente do cadastro. Concluída a venda aparece o
troco em letra grande: Enter imprime (NFC-e abre o DANFE; balcão abre o pedido), F4 abre a gaveta,
Esc começa a próxima.

Dentro do PDV as teclas da venda vencem os atalhos globais do menu: Ctrl+D cancela venda em vez de
abrir outra tela, F10 informa cliente em vez de ir para a barra de menus.

### Gaveta

F4 manda o pulso ESC/POS `ESC p 0 25 250` para a impressora não fiscal pela **Web Serial** (Chrome
ou Edge). Na primeira vez o navegador pergunta a porta; depois ela fica lembrada e a gaveta abre
sozinha ao concluir venda com dinheiro. Trocar de impressora: Outros Recursos › Impressora da gaveta.

### Balança

Etiqueta EAN-13 começando com 2: `2 CCCCC VVVVV D` — código interno do produto em 5 dígitos, depois
peso em gramas ou valor em centavos (Outros Recursos › Etiqueta da balança) e o dígito verificador.
Lida no campo do produto, lança sozinha. O produto é achado pelo **código interno** do cadastro,
com ou sem os zeros da etiqueta.

## Impressão do pedido

"PEDIDO DE VENDA (SEM VALOR FISCAL)" em A4, igual ao do Syndata: logo e emitente (do Assistente de
Configuração de NF-e e da marca do tenant), número, vendedor e assessor, cliente com fantasia,
endereço, CNPJ, IE e telefone, forma de pagamento, itens com código, quantidade, unidade, peso,
valor unitário e total, totais (bruto, frete, acréscimos, descontos, peso, líquido), assinaturas de
vendedor e cliente, emissão e "Página X de Y".

A API monta o documento (`GET vendas/balcao/pedidos/:id/impressao` e
`GET sales/pos/sales/:id/impressao`); a tela só desenha e chama `window.print()`. O CSS de impressão
esconde o resto do sistema só enquanto imprime.

## Testes

- API: `sales/services/pos.service.spec.ts`, `sales/services/sale-fiscal.integration.spec.ts`,
  `vendas/balcao/pedido-de-balcao.service.spec.ts`; no emulador,
  `sales/repositories/caixa.emulador.spec.ts` (numeração concorrente e caixa aberto).
- Web: `features/vendas/**/*.test.ts(x)` — conta dos itens, etiqueta da balança, pagamento, e as
  duas telas de ponta a ponta com a API em dublê.
