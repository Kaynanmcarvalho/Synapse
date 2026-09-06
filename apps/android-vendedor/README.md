# apps/android-vendedor

Reservado para o app Android nativo do vendedor externo — cartao **[F7] App Android offline-first**.

Nao e um workspace pnpm de proposito: o `pnpm-workspace.yaml` so enxerga diretorios com
`package.json`, entao esta pasta fica fora do grafo do Turborepo ate o projeto Gradle existir.

## O que entra aqui na F7

- Projeto Gradle (Kotlin + Jetpack Compose)
- Persistencia local (Room) com fila de sincronizacao
- Estrategia de resolucao de conflito definida no cartao **[F0] Proposta de arquitetura e ADRs**

## O que ja esta pronto para ele

- `packages/types` — os mesmos contratos usados pela API, para espelhar no Kotlin
- `apps/web-vendedor` — portal web equivalente, util como referencia de fluxo
