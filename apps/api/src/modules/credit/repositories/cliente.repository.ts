import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from '@synapse/firebase/admin';
import type { CadastroDoCliente } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';
import type { Ator } from '../entities/historico';

/** Devolve so os campos do cadastro: o documento guarda tambem tenantId e
 *  autoria, que nao podem voltar para o cliente — um formulario que reenvia o
 *  que recebeu seria recusado por mandar o tenant no corpo. */
const paraCadastro = (dados: CadastroDoCliente): CadastroDoCliente => ({
  id: dados.id,
  codigo: dados.codigo ?? null,
  type: dados.type,
  name: dados.name,
  legalName: dados.legalName ?? null,
  taxId: dados.taxId ?? '',
  stateRegistration: dados.stateRegistration ?? null,
  phone: dados.phone ?? '',
  whatsapp: dados.whatsapp ?? null,
  email: dados.email ?? null,
  address: dados.address,
  creditLimit: dados.creditLimit ?? 0,
  financialStatus: dados.financialStatus ?? null,
  updatedAt: dados.updatedAt ?? null,
  updatedByName: dados.updatedByName ?? null,
});

/** O cadastro do cliente visto pelo credito. Grava em `customers` com os mesmos
 *  nomes de campo do `Customer` do catalogo, e sempre com `merge`: o que o
 *  catalogo guardar ali (tabela de preco, vendedor responsavel) nao e apagado. */
@Injectable()
export class ClienteRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private documento(tenantId: string, id: string) {
    return this.db.doc(`tenants/${tenantId}/customers/${id}`);
  }

  async buscar(tenantId: string, id: string): Promise<CadastroDoCliente | null> {
    const snapshot = await this.documento(tenantId, id).get();
    return snapshot.exists ? paraCadastro(snapshot.data() as CadastroDoCliente) : null;
  }

  /** Varios cadastros numa ida so ao banco — a fila le todos os clientes dela. */
  async buscarVarios(
    tenantId: string,
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, CadastroDoCliente>> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return new Map();
    const snapshots = await this.db.getAll(...unicos.map((id) => this.documento(tenantId, id)));
    return new Map(
      snapshots.flatMap((snapshot) =>
        snapshot.exists ? [[snapshot.id, paraCadastro(snapshot.data() as CadastroDoCliente)]] : [],
      ),
    );
  }

  /** `financialStatus` e do catalogo: o credito le, mas nao grava. */
  async salvar(
    tenantId: string,
    cadastro: CadastroDoCliente,
    ator: Ator,
  ): Promise<CadastroDoCliente> {
    const { financialStatus: _ignorado, ...editavel } = cadastro;
    const gravado: CadastroDoCliente = {
      ...editavel,
      updatedAt: new Date().toISOString(),
      updatedByName: ator.nome,
    };
    await this.documento(tenantId, cadastro.id).set(
      { ...gravado, tenantId, updatedBy: ator.uid },
      { merge: true },
    );
    return (await this.buscar(tenantId, cadastro.id)) ?? gravado;
  }
}
