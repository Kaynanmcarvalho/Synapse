import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { type AppCheck, getAppCheck } from 'firebase-admin/app-check';
import { type Firestore, getFirestore } from 'firebase-admin/firestore';
import { type Messaging, getMessaging } from 'firebase-admin/messaging';
import { isEmulatorMode, readAdminCredentials } from './config';

const APP_NAME = 'synapse-admin';

let cached: App | null = null;

export const getAdminApp = (): App => {
  if (cached) return cached;

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) {
    cached = existing;
    return cached;
  }

  if (isEmulatorMode()) {
    // O `firebase emulators:exec` informa o projeto do emulador em GCLOUD_PROJECT.
    // Ele vem antes do FIREBASE_PROJECT_ID porque o .env.local aponta este para o
    // projeto real: sem essa ordem, o token do emulador (demo-synapse) seria recusado.
    const projectId =
      process.env['GCLOUD_PROJECT'] ?? process.env['FIREBASE_PROJECT_ID'] ?? 'demo-synapse';
    cached = initializeApp({ projectId }, APP_NAME);
    return cached;
  }

  const credentials = readAdminCredentials();
  cached = initializeApp({ credential: cert(credentials) }, APP_NAME);
  return cached;
};

export const getAdminAuth = (): Auth => getAuth(getAdminApp());

export const getAdminAppCheck = (): AppCheck => getAppCheck(getAdminApp());

export const getAdminFirestore = (): Firestore => getFirestore(getAdminApp());

export const getAdminMessaging = (): Messaging => getMessaging(getAdminApp());
