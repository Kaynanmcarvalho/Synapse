import { execFileSync } from 'node:child_process';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);
  return value;
};
const project = required('FIREBASE_PROJECT_ID');
const backupRoot = required('BACKUP_ROOT').replace(/\/$/, '');
const targetBucket = required('TARGET_STORAGE_BUCKET');
const commands = [
  ['gcloud', ['firestore', 'import', `${backupRoot}/firestore`, '--project', project]],
  ['gcloud', ['storage', 'rsync', `${backupRoot}/storage`, `gs://${targetBucket}`, '--recursive']],
];

if (process.argv.includes('--dry-run')) {
  process.stdout.write(
    `${JSON.stringify({ event: 'restore_plan_valid', project, backupRoot, targetBucket, commands })}\n`,
  );
  process.exit(0);
}
if (process.env.CONFIRM_RESTORE !== `${project}:${backupRoot}`) {
  throw new Error('CONFIRM_RESTORE deve ser exatamente <projeto>:<BACKUP_ROOT>');
}
for (const [command, args] of commands) execFileSync(command, args, { stdio: 'inherit' });
process.stdout.write(
  `${JSON.stringify({ event: 'restore_completed', project, backupRoot, timestamp: new Date().toISOString() })}\n`,
);
