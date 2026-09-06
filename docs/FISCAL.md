# Fiscal

O módulo fiscal isola integrações no contrato `FiscalProvider`. O mock cobre os nove métodos e o adaptador Gyn Fiscal usa somente as rotas publicadas em <https://gynfiscal.netlify.app/documentacao/>.

## Segurança

- `FISCAL_MASTER_KEY` deve conter 32 bytes aleatórios em base64 e vir do secret manager da infraestrutura.
- Certificado A1, senha, CSC e credenciais do provider entram somente no backend. A configuração persistida guarda referências opacas.
- Nunca inclua esses valores em `VITE_*`, respostas HTTP, logs ou commits.

## Persistência e numeração

Execute `apps/api/migrations/001_fiscal.sql` no PostgreSQL. A numeração deve ser reservada pelo `UPSERT ... ON CONFLICT ... DO UPDATE RETURNING` documentado na migration, dentro da mesma transação que cria o documento. Isso impede que duas instâncias emitam o mesmo número; o frontend nunca recebe autoridade para escolher a numeração.

## Gyn Fiscal

Headers obrigatórios: `x-api-key`, `x-tenant-id` e `Content-Type: application/json`. Rotas implementadas: emissão assíncrona, consulta por chave, cancelamento, inutilização, acompanhamento de job, XML e DANFE. A documentação consultada menciona XML de CC-e, mas não publica uma rota para criar CC-e; por isso o adaptador responde explicitamente como não suportado em vez de inventar um endpoint.

Em produção, processe emissão e polling de `jobId` por fila com a mesma chave de idempotência, três tentativas com backoff/jitter e dead-letter. O registro fiscal preserva tentativas, código/mensagem SEFAZ, chave, protocolo e XML.
