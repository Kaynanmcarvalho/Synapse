# Dependências de documentação oficial

Itens que não devem ser completados por suposição:

- Sicredi e Itaú: contratos de boleto, PIX, extrato, OAuth/mTLS e assinatura de webhook de cada convênio ainda precisam ser fornecidos e homologados.
- Gyn Fiscal: payloads finais por regime/UF e credenciais para testes reais de NFC-e, DF-e e MDF-e em homologação.
- SEFAZ: prazos de cancelamento, contingência e particularidades por UF devem ser confirmados antes da produção.
- LGPD/fiscal: retenção, descarte, RPO e RTO dependem de jurídico, contabilidade e operação.
- Android: o teste instrumental modo avião requer Android SDK/emulador, projeto Firebase e API local configurados.

O código usa providers ou mocks quando o contrato é conhecido e falha explicitamente quando falta documentação; não inventa endpoints bancários.
