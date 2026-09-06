# Documentacao

| Documento                              | Conteudo                                 |
| -------------------------------------- | ---------------------------------------- |
| [convencoes.md](convencoes.md)         | padroes de codigo, camadas e nomes       |
| [adr/](adr/)                           | decisoes de arquitetura, uma por arquivo |
| [AUTHENTICATION.md](AUTHENTICATION.md) | autenticacao, sessoes e tenant           |
| [DATABASE.md](DATABASE.md)             | modelagem de dados e indices             |
| [architecture/](architecture/)         | proposta e ADRs da Fase 0                |

## Ordem de trabalho

A spec (§69) exige arquitetura escrita e aprovada **antes** da implementacao. O cartao
**[F0] Proposta de arquitetura e ADRs** produz os diagramas e os ADRs que vao para `adr/`;
so depois disso a Fase 1 abre.

Este cartao ([F0] Monorepo, tooling e padroes de codigo) entrega a fundacao tecnica em
paralelo: estrutura, tooling e CI, sem nenhuma regra de negocio.

## ADRs

Um arquivo por decisao, numerado: `adr/0001-titulo-curto.md`. Formato:

```markdown
# ADR 0001 — Titulo

- **Status:** proposto | aceito | substituido por ADR XXXX
- **Data:** AAAA-MM-DD

## Contexto

O que forcou a decisao.

## Opcoes

As alternativas reais que estavam na mesa.

## Decisao

O que foi escolhido.

## Consequencia

O que isso facilita e o que passa a custar caro.
```

Pendentes, conforme o checklist do cartao de arquitetura: Firestore x PostgreSQL,
estrategia de isolamento de tenant e versionamento de API.
