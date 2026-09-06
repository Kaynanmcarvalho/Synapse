# Auditoria imutável

Operações sensíveis usam `@AuditedMutation` no controller. O interceptor global captura automaticamente usuário, IP, dispositivo, operação, entidade, snapshot anterior, resultado posterior, data e correlação. O repositório oferece apenas `append` e consulta: não existem métodos de alteração ou exclusão.

Domínios obrigatórios: preço, estoque, permissão, fiscal e financeiro; clientes e fornecedores também são auditados. As regras do Firestore negam create/update/delete pelo cliente — gravações append-only usam exclusivamente o Admin SDK.

Retenção: sete anos em armazenamento primário. Após 24 meses, exportar mensalmente para bucket WORM com Object Lock, mantendo índice de consulta. Logs de acesso LGPD seguem o mesmo prazo, com acesso restrito e toda exportação também auditada.
