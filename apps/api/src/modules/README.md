# Modulos da API

Um diretorio por dominio. Dentro de cada um, uma pasta por tipo de arquivo — nunca
um arquivo grande concentrando varias responsabilidades (spec 70).

```
<dominio>/
  controllers/    rotas HTTP; so traduzem requisicao para chamada de servico
  services/       regra de negocio; nao conhece HTTP nem Firestore
  repositories/   acesso a dados; unico lugar que fala com o Firestore
  dto/            formato de entrada e saida, validado por schema Zod
  entities/       modelo de dominio interno
  events/         eventos publicados e seus handlers
  jobs/           tarefas agendadas e filas
  <dominio>.module.ts
```

| Dominio       | Fase | Escopo                                                       |
| ------------- | ---- | ------------------------------------------------------------ |
| `iam`         | F1   | autenticacao, tenants, filiais, RBAC, auditoria              |
| `catalog`     | F2   | produtos, precos, clientes e fornecedores                    |
| `inventory`   | F3   | estoque multi-deposito, lotes, transferencias, inventario    |
| `sales`       | F4   | orcamento ate entrega, PDV e caixa                           |
| `fiscal`      | F5   | NF-e, NFC-e, DF-e, MDF-e e o FiscalProvider                  |
| `finance`     | F6   | boletos, contas a pagar e receber, conciliacao, BankProvider |
| `field-sales` | F7   | app do vendedor externo e portal web                         |
| `credit`      | F7   | analise de credito: fila de pedidos e ficha do cliente       |
| `analytics`   | F8   | dashboards, curva ABC, compras, expedicao                    |
| `platform`    | F9   | planos, limites, billing, feature flags, notificacoes        |

O modulo `health` ja esta implementado e serve de referencia de formato.
