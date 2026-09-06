import { FirebaseConfigError } from '../common/errors';

export interface AdminCredentials {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
}

/** Os emuladores nao verificam credencial real: so precisam saber o projectId.
 *  Ligado sempre que uma das variaveis padrao do Firebase CLI estiver presente. */
export const isEmulatorMode = (env: NodeJS.ProcessEnv = process.env): boolean =>
  Boolean(env['FIRESTORE_EMULATOR_HOST'] ?? env['FIREBASE_AUTH_EMULATOR_HOST']);

/** Le as credenciais do ambiente. A chave privada chega com \n escapado
 *  quando vem de variavel de ambiente, entao desfazemos o escape aqui. */
export const readAdminCredentials = (env: NodeJS.ProcessEnv = process.env): AdminCredentials => {
  const projectId = env['FIREBASE_PROJECT_ID'];
  const clientEmail = env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = env['FIREBASE_PRIVATE_KEY'];

  const missing = [
    projectId ? null : 'FIREBASE_PROJECT_ID',
    clientEmail ? null : 'FIREBASE_CLIENT_EMAIL',
    privateKey ? null : 'FIREBASE_PRIVATE_KEY',
  ].filter((name): name is string => name !== null);

  if (missing.length > 0 || !projectId || !clientEmail || !privateKey) {
    throw new FirebaseConfigError(missing);
  }

  return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') };
};
