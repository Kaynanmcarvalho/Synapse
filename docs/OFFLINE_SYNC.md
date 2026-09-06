# Sincronização offline

O aplicativo Android do vendedor usa Room como cache de clientes, produtos, preços, estoque permitido e pedidos. O estoque local serve apenas para orientar a venda: nunca autoriza a reserva definitiva.

## Fluxo

1. O pedido nasce no aparelho com UUID, `createdAt`, `updatedAt`, `version` e chave `android-order:<uuid>`.
2. Room persiste o pedido como `PENDING` antes de qualquer tentativa de rede.
3. WorkManager agenda um trabalho único, condicionado a conectividade, e repete falhas transitórias.
4. `POST /api/v1/sales/offline-sync/orders` recalcula o preço e lê o saldo atual no servidor.
5. Preço alterado gera `CONFLICT`; falta de estoque gera `REJECTED`; apenas um pedido validado vira `ACCEPTED` e reserva estoque.
6. Reenvios da mesma chave devolvem o resultado gravado e não criam outro pedido.

Firebase Auth mantém o usuário autenticado no dispositivo; a sessão de API fica em armazenamento privado do aplicativo. FCM recebe avisos de alterações e conflitos. A tela inicial lista pedidos `CONFLICT` e `REJECTED` para ação explícita do vendedor.

## Teste operacional obrigatório

No emulador: ativar modo avião, criar três pedidos, encerrar e reabrir o app, desativar modo avião e aguardar o WorkManager. Confirmar no backend exatamente três pedidos e repetir manualmente a sincronização para provar que o total não aumenta. Esse teste depende de Android SDK, emulador, Firebase e API locais configurados.
