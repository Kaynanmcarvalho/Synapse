# Operação, observabilidade e recuperação

## Ambientes e entrega

Os GitHub Environments `development`, `staging` e `production` devem ter projetos Firebase, service accounts, buckets, certificados, URLs e secrets distintos. O workflow `deploy.yml` associa `develop`, `staging` e `main` a esses ambientes; proteções e aprovações de produção ficam no GitHub Environment.

Cada ambiente define `FIREBASE_PROJECT_ID`, `SOURCE_STORAGE_BUCKET`, `GCP_REGION`, `ARTIFACT_REPOSITORY` e `CLOUD_RUN_SERVICE` como variables. Autenticação usa Workload Identity Federation e service accounts diferentes para deploy, backup e restore.

## Observabilidade

A API devolve `X-Request-ID` e `X-Correlation-ID`, aceita esses cabeçalhos na entrada e preserva `traceparent`. Logs HTTP e erros não tratados são JSON com nível, evento, rota, status, duração e IDs de correlação. A rota autenticada `GET /api/v1/metrics`, restrita a `auditoria.visualizar`, expõe contadores, erros e latência no formato Prometheus.

Alertas mínimos: erro 5xx acima de 2% por cinco minutos, p95 acima do orçamento do endpoint, fila sem consumo e falha no backup agendado.

## Backup e restauração

`backup.yml` exporta diariamente Firestore e Storage para um bucket separado. Esse bucket deve ter versionamento, retenção e lifecycle definidos na infraestrutura da conta.

O drill trimestral deve:

1. selecionar um backup concluído e criar/alocar um projeto isolado de restore;
2. executar `restore.yml`, que não aceita `production` como destino;
3. validar contagens de documentos, amostra de hashes dos objetos e login de uma conta sintética;
4. registrar backup, projeto de destino, horários, RPO/RTO observado e responsável;
5. destruir o ambiente temporário após a evidência ser aprovada.

O plano pode ser validado localmente sem tocar na nuvem:

```powershell
$env:FIREBASE_PROJECT_ID='restore-sandbox'
$env:BACKUP_ROOT='gs://backup/synapse/2026-09-06T03-17-00Z'
$env:TARGET_STORAGE_BUCKET='restore-sandbox.appspot.com'
pnpm restore:gcp:dry-run
```

Isso valida apenas os comandos e as travas. O item “teste real de restauração” só pode ser encerrado com execução e evidência em um projeto GCP isolado.

## Rollback

O workflow `rollback.yml` move 100% do tráfego do Cloud Run para uma revisão anterior informada. Antes da mudança, confirme que a revisão usa schema compatível; migrations seguem expand/contract. Depois, valide health, login, uma leitura por tenant e uma operação sintética. Se a revisão falhar, redirecione o tráfego para a revisão que estava ativa.

O comando e suas travas podem ser testados sem alterar tráfego com `pnpm rollback:gcp:dry-run`, depois de definir `FIREBASE_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SERVICE` e `ROLLBACK_REVISION`.
