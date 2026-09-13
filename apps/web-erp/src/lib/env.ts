/** Ponto unico de leitura das variaveis do Vite. */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1',
  emuladorDoAuth: __FIREBASE_AUTH_EMULATOR_HOST__,
  firebase: {
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_APP_CHECK_SITE_KEY: import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY,
    VITE_FIREBASE_VAPID_KEY: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  },
} as const;
