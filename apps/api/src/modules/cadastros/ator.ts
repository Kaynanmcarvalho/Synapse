import type { DecodedIdToken } from '@synapse/firebase/admin';
import type { AuditActor } from '@synapse/types';

/** Quem está salvando, com nome e e-mail do token: é o que a ficha mostra em
 *  "cadastrado por" e "última alteração". O uid sozinho não diz nada a quem lê. */
export const atorDoToken = (auth: DecodedIdToken): AuditActor => ({
  uid: auth.uid as AuditActor['uid'],
  email: auth.email ?? '',
  name: (typeof auth['name'] === 'string' && auth['name']) || '',
  source: 'api',
});
