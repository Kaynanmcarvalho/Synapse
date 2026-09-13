import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

/** Nome de quem registrou algo (uma liquidacao, por exemplo), para a tela nao
 *  mostrar um uid. O vinculo do usuario guarda o e-mail; nome, quando houver. */
@Injectable()
export class UsuarioRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  async nomes(tenantId: string, uids: readonly string[]): Promise<ReadonlyMap<string, string>> {
    const unicos = [...new Set(uids)].filter(Boolean);
    if (unicos.length === 0) return new Map();
    const snapshots = await this.db.getAll(
      ...unicos.map((uid) => this.db.doc(`tenants/${tenantId}/users/${uid}`)),
    );
    return new Map(
      snapshots.flatMap((snapshot) => {
        if (!snapshot.exists) return [];
        const dados = snapshot.data() ?? {};
        const nome = [dados['name'], dados['displayName'], dados['email']].find(
          (valor): valor is string => typeof valor === 'string' && valor.trim() !== '',
        );
        return nome ? [[snapshot.id, nome]] : [];
      }),
    );
  }
}
