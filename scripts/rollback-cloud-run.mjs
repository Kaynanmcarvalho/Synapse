import { execFileSync } from 'node:child_process';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);
  return value;
};
const project = required('FIREBASE_PROJECT_ID');
const region = required('GCP_REGION');
const service = required('CLOUD_RUN_SERVICE');
const revision = required('ROLLBACK_REVISION');
if (!/^[a-z][a-z0-9-]{1,62}$/.test(revision)) throw new Error('ROLLBACK_REVISION inválida');
const args = [
  'run',
  'services',
  'update-traffic',
  service,
  '--to-revisions',
  `${revision}=100`,
  '--region',
  region,
  '--project',
  project,
];
if (process.argv.includes('--dry-run')) {
  process.stdout.write(
    `${JSON.stringify({ event: 'rollback_plan_valid', command: 'gcloud', args })}\n`,
  );
  process.exit(0);
}
if (process.env.CONFIRM_ROLLBACK !== `${project}:${service}:${revision}`) {
  throw new Error('CONFIRM_ROLLBACK deve ser exatamente <projeto>:<serviço>:<revisão>');
}
execFileSync('gcloud', args, { stdio: 'inherit' });
