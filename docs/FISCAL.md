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

## NFC-e no PDV

O fechamento de venda em `POST /sales/pos/cash-sessions/:id/sales` recebe também `companyId` e emite a NFC-e com a chave idempotente `pos-nfce:<saleId>`. A configuração fiscal da empresa mantém o CSC no cofre e somente sua referência no banco. Para provedores reais, `cscId` e CSC são obrigatórios.

Quando a comunicação normal com a SEFAZ falha e `nfceContingencyEnabled` está ativo, o backend reenvia a emissão à Gyn Fiscal com `formaEmissao: contingencia_offline`, devolve o documento ao PDV com status `CONTINGENCY` e registra o acompanhamento em `nfce_contingency_queue`. A regularização consulta `GET /fiscal/nfce/job/:jobId`; também pode ser acionada por `POST /fiscal/nfce/:id/retry-contingency`. A fila só é removida depois de autorização ou rejeição definitiva.

Para impressão, `GET /fiscal/nfce/:id/danfe` usa a rota DANFE específica de NFC-e e expõe a URL presente no elemento `qrCode` do XML no header `x-nfce-qrcode-url`. O cancelamento usa a rota própria de NFC-e e respeita `nfceCancellationWindowMinutes` (30 minutos por padrão). Confirme o prazo vigente da UF antes de ativar produção.

Checklist de homologação antes da produção:

- cadastrar certificado, CSC, identificador do CSC e credenciais do tenant;
- configurar `environment: HOMOLOGACAO`, série e regra de contingência da empresa;
- fechar uma venda no PDV, acompanhar o job até `AUTHORIZED` e conferir DANFE/QR Code;
- simular indisponibilidade, confirmar `CONTINGENCY` e sua posterior regularização;
- cancelar dentro do prazo configurado e validar o protocolo retornado;
- somente então mudar para `PRODUCAO` com a confirmação explícita exigida pela API.
