# ADR-0007 — Portas e adaptadores para fiscal e bancos

- Status: Proposto
- Data: 2026-09-05

## Contexto

Fornecedores fiscais e bancos variam em autenticação, payloads, estados e disponibilidade. Essas diferenças não devem contaminar os domínios fiscal e financeiro.

## Opções

1. Integrar cada API diretamente nos services.
2. Criar uma interface normalizada e adaptadores por provedor.

## Decisão

Adotar a opção 2 com `FiscalProvider` e `BankProvider`. O domínio usa comandos e respostas canônicos; adaptadores mapeiam contrato, autenticação, erros e assinatura de webhook. Cada provider suporta apenas capacidades declaradas e ambientes MOCK, SANDBOX, HOMOLOGAÇÃO e PRODUÇÃO. Campos e endpoints só são implementados após validação da documentação oficial/contrato.

## Consequências

Mocks e testes de contrato ficam simples e trocar/adicionar fornecedor não altera o domínio. A normalização pode esconder recursos exclusivos; capacidades opcionais e dados brutos auditáveis devem ser preservados sem vazar o payload externo para as regras centrais.
