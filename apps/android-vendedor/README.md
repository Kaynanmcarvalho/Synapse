# Synapse Vendedor Android

Aplicativo Kotlin/Compose offline-first. Room mantém o catálogo permitido e pedidos locais; WorkManager envia a fila com uma chave idempotente por pedido. O servidor sempre recalcula preço e estoque. Divergências aparecem na tela de conflitos e nunca são aceitas silenciosamente.

Configure `google-services.json` localmente e `API_BASE_URL` em `local.properties`. Abra esta pasta no Android Studio, sincronize o Gradle e execute `connectedCheck` com um emulador API 26+.
