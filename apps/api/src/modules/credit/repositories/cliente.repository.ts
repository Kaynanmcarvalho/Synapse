import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { CadastroDoCliente } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import type { Ator } from '../entities/historico';

/** O cadastro do cliente visto pelo credito. Grava em `customers` com os mesmos
 *  nomes de campo do `Customer` do catalogo, e sempre com `merge`: o que o
 *  catalogo guardar ali (tabela de preco, vendedor responsavel) nao e apagado. */
@Injectable()
export class ClienteRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private documento(tenantId: string, id: string) {
    return this.db.doc(`tenants/${tenantId}/customers/${id}`);
  }

  /** Devolve so os campos do cadastro: o documento guarda tambem tenantId e
   *  autoria, que nao podem voltar para o cliente — um formulario que reenvia o
   *  que recebeu seria recusado por mandar o tenant no corpo. */
  async buscar(tenantId: string, id: string): Promise<CadastroDoCliente | null> {
    const snapshot = await this.documento(tenantId, id).get();
    if (!snapshot.exists) return null;
    const dados = snapshot.data() as CadastroDoCliente;
    return {
      id: dados.id,
      type: dados.type,
      name: dados.name,
      legalName: dados.legalName ?? null,
      taxId: dados.taxId,
      stateRegistration: dados.stateRegistration ?? null,
      phone: dados.phone ?? '',
      whatsapp: dados.whatsapp ?? null,
      email: dados.email ?? null,
      address: dados.address,
      creditLimit: dados.creditLimit ?? 0,
      updatedAt: dados.updatedAt ?? null,
      updatedByName: dados.updatedByName ?? null,
    };
  }

  async salvar(
    tenantId: string,
    cadastro: CadastroDoCliente,
    ator: Ator,
  ): Promise<CadastroDoCliente> {
    const gravado: CadastroDoCliente = {
      ...cadastro,
      updatedAt: new Date().toISOString(),
      updatedByName: ator.nome,
    };
    await this.documento(tenantId, cadastro.id).set(
      { ...gravado, tenantId, updatedBy: ator.uid },
      { merge: true },
    );
    return gravado;
  }
}
