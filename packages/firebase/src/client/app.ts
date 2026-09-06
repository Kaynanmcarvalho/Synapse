import { type FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { type ClientEnv, readClientConfig } from './config';

let cached: FirebaseApp | null = null;

export const initFirebaseClient = (env: ClientEnv): FirebaseApp => {
  if (cached) return cached;
  const existing = getApps()[0];
  cached = existing ?? initializeApp(readClientConfig(env));
  return cached;
};

export const getClientAuth = (env: ClientEnv): Auth => getAuth(initFirebaseClient(env));

export const getClientFirestore = (env: ClientEnv): Firestore =>
  getFirestore(initFirebaseClient(env));
