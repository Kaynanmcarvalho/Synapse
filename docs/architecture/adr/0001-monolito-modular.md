# ADR-0001 — Monólito modular e workers

- Status: Proposto
- Data: 2026-09-05

## Contexto

O ERP possui muitos domínios, mas começa com uma base e uma equipe ainda sem evidência de gargalos que justifiquem microsserviços. Fiscal, bancos, webhooks e relatórios exigem processamento assíncrono.

## Opções

1. Microsserviços desde o início.
2. Monólito sem fronteiras formais.
3. Monólito modular, com API e workers implantados separadamente.

## Decisão

Adotar a opção 3. Cada domínio possui contrato público, aplicação, domínio e infraestrutura próprios. API e workers compartilham pacotes de domínio, mas têm processos e escala separados. Comunicação síncrona interna usa portas; efeitos assíncronos usam eventos.

## Consequências

Menor custo operacional e transações locais mais simples, com disciplina arquitetural obrigatória para impedir acoplamento. Um módulo pode ser extraído quando métricas justificarem, sem assumir previamente o custo de uma arquitetura distribuída.
