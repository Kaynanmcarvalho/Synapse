import { Global, Module } from '@nestjs/common';
import { getAdminAppCheck, getAdminAuth, getAdminFirestore } from '@synapse/firebase/admin';
import { FIREBASE_APP_CHECK, FIREBASE_AUTH, FIREBASE_FIRESTORE } from './firebase.tokens';

@Global()
@Module({
  providers: [
    { provide: FIREBASE_AUTH, useFactory: getAdminAuth },
    { provide: FIREBASE_APP_CHECK, useFactory: getAdminAppCheck },
    { provide: FIREBASE_FIRESTORE, useFactory: getAdminFirestore },
  ],
  exports: [FIREBASE_AUTH, FIREBASE_APP_CHECK, FIREBASE_FIRESTORE],
})
export class FirebaseModule {}
