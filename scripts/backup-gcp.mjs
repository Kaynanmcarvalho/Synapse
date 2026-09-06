import { execFileSync } from 'node:child_process';

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);
  return value;
};
const project = required('FIREBASE_PROJECT_ID');
const backupBucket = required('BACKUP_BUCKET');
const sourceBucket = required('SOURCE_STORAGE_BUCKET');
const stamp = new Date()
  .toISOString()
  .replaceAll(':', '-')
  .replace(/\.\d{3}Z$/, 'Z');
const root = `gs://${backupBucket}/${project}/${stamp}`;

execFileSync('gcloud', ['firestore', 'export', `${root}/firestore`, '--project', project], {
  stdio: 'inherit',
});
execFileSync(
  'gcloud',
  ['storage', 'rsync', `gs://${sourceBucket}`, `${root}/storage`, '--recursive'],
  { stdio: 'inherit' },
);
process.stdout.write(
  `${JSON.stringify({ event: 'backup_completed', project, root, timestamp: new Date().toISOString() })}\n`,
);
