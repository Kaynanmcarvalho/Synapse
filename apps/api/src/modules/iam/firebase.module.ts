import { Global, Module } from '@nestjs/common';
import {
  getAdminAppCheck,
  getAdminAuth,
  getAdminFirestore,
  getAdminMessaging,
} from '@synapse/firebase/admin';
import {
  FIREBASE_APP_CHECK,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
  FIREBASE_MESSAGING,
} from './firebase.tokens';

@Global()
@Module({
  providers: [
    { provide: FIREBASE_AUTH, useFactory: getAdminAuth },
    { provide: FIREBASE_APP_CHECK, useFactory: getAdminAppCheck },
    { provide: FIREBASE_FIRESTORE, useFactory: getAdminFirestore },
    { provide: FIREBASE_MESSAGING, useFactory: getAdminMessaging },
  ],
  exports: [FIREBASE_AUTH, FIREBASE_APP_CHECK, FIREBASE_FIRESTORE, FIREBASE_MESSAGING],
})
export class FirebaseModule {}
