import type { FirebaseOptions } from 'firebase/app';
import { FirebaseConfigError } from '../common/errors';

export interface ClientEnv {
  readonly VITE_FIREBASE_API_KEY?: string | undefined;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string | undefined;
  readonly VITE_FIREBASE_PROJECT_ID?: string | undefined;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string | undefined;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string | undefined;
  readonly VITE_FIREBASE_APP_ID?: string | undefined;
  readonly VITE_FIREBASE_APP_CHECK_SITE_KEY?: string | undefined;
}

const REQUIRED: ReadonlyArray<keyof ClientEnv> = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

/** As opcionais so entram no objeto quando existem: com exactOptionalPropertyTypes
 *  ligado, `storageBucket: undefined` e diferente de nao ter a chave. */
export const readClientConfig = (env: ClientEnv): FirebaseOptions => {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length > 0) throw new FirebaseConfigError(missing);

  const apiKey = env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const appId = env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new FirebaseConfigError(REQUIRED);
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    ...(env.VITE_FIREBASE_STORAGE_BUCKET
      ? { storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET }
      : {}),
    ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID }
      : {}),
  };
};
