import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot, Transaction } from '@synapse/firebase/admin';
import type { FornecedorNaLista, PaginaDeFornecedores, Supplier } from '@synapse/types';
import { searchTerms, searchTokens } from '../../../common/search/search-tokens';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

const COLECAO = 'suppliers';
const CONTADOR = 'suppliers';

type FornecedorGravado = Supplier & { readonly searchTokens?: readonly string[] };

/** O que o balcão digita para achar o fornecedor. */
const textoDeBusca = (fornecedor: Supplier): string =>
  [
    fornecedor.legalName,
    fornecedor.tradeName,
    fornecedor.taxId,
    fornecedor.codigo ? String(fornecedor.codigo) : '',
    fornecedor.endereco?.cidade ?? '',
    fornecedor.telefone1?.numero ?? '',
    fornecedor.telefone2?.numero ?? '',
    fornecedor.email ?? '',
  ].join(' ');

const doGravado = (dados: unknown): Supplier => {
  const { searchTokens: _tokens, ...fornecedor } = dados as FornecedorGravado;
  return {
    ...fornecedor,
    contacts: fornecedor.contacts ?? [],
    productIds: fornecedor.productIds ?? [],
    active: fornecedor.active ?? true,
  };
};

const comIndice = (fornecedor: Supplier) => ({
  ...fornecedor,
  searchTokens: searchTokens(textoDeBusca(fornecedor)),
});

export const fornecedorNaLista = (fornecedor: Supplier): FornecedorNaLista => ({
  id: fornecedor.id,
  codigo: fornecedor.codigo ?? null,
  razaoSocial: fornecedor.legalName,
  nomeFantasia: fornecedor.tradeName,
  documento: fornecedor.taxId,
  tipoDePessoa: fornecedor.tipoDePessoa ?? 'JURIDICA',
  cidade: fornecedor.endereco?.cidade ?? '',
  uf: fornecedor.endereco?.uf ?? '',
  telefone: fornecedor.telefone1?.numero ?? fornecedor.contacts[0]?.phone ?? null,
  grupo: fornecedor.grupo?.nome ?? null,
  ativo: fornecedor.active,
  atualizadoEm: fornecedor.updatedAt ?? null,
});

/** Fornecedores em `tenants/{t}/suppliers/{id}` — um fornecedor, um documento.
 *
 *  Antes ficava num `Map` em memória do catálogo: reiniciar a API apagava os
 *  fornecedores, e a inteligência de estoque perdia prazo de entrega e estoque
 *  de segurança. Agora o cadastro, as compras, a busca global e a inteligência
 *  de estoque leem daqui. */
@Injectable()
export class FornecedorRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private colecao(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/${COLECAO}`);
  }

  async buscar(tenantId: string, id: string): Promise<Supplier | null> {
    const snapshot = await this.colecao(tenantId).doc(id).get();
    return snapshot.exists ? doGravado(snapshot.data()) : null;
  }

  async porCodigo(tenantId: string, codigo: number): Promise<Supplier | null> {
    const result = await this.colecao(tenantId).where('codigo', '==', codigo).limit(1).get();
    const [primeiro] = result.docs;
    return primeiro ? doGravado(primeiro.data()) : null;
  }

  async porDocumento(tenantId: string, documento: string): Promise<Supplier | null> {
    if (!documento) return null;
    const result = await this.colecao(tenantId).where('taxId', '==', documento).limit(1).get();
    const [primeiro] = result.docs;
    return primeiro ? doGravado(primeiro.data()) : null;
  }

  /** Por razão social, paginando pelo id do último lido. */
  async listar(
    tenantId: string,
    opcoes: { readonly limite: number; readonly cursor?: string | null; readonly ativo?: boolean },
  ): Promise<PaginaDeFornecedores> {
    let consulta = this.colecao(tenantId)
      .orderBy('legalName')
      .limit(opcoes.limite + 1);
    if (opcoes.ativo !== undefined) consulta = consulta.where('active', '==', opcoes.ativo);
    if (opcoes.cursor) {
      const ancora = await this.colecao(tenantId).doc(opcoes.cursor).get();
      if (ancora.exists) consulta = consulta.startAfter(ancora);
    }
    const lidos = (await consulta.get()).docs.map((doc: QueryDocumentSnapshot) =>
      doGravado(doc.data()),
    );
    const pagina = lidos.slice(0, opcoes.limite);
    return {
      itens: pagina.map(fornecedorNaLista),
      proximoCursor: lidos.length > opcoes.limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  }

  /** Busca por prefixo de palavra, por documento ou pelo código. */
  async procurar(tenantId: string, termo: string, limite: number): Promise<Supplier[]> {
    const limpo = termo.trim();
    if (!limpo) {
      const snapshot = await this.colecao(tenantId).orderBy('legalName').limit(limite).get();
      return snapshot.docs.map((doc: QueryDocumentSnapshot) => doGravado(doc.data()));
    }
    const digitos = limpo.replace(/\D/g, '');
    if (/^\d{1,9}$/.test(limpo)) {
      const porCodigo = await this.porCodigo(tenantId, Number(limpo));
      if (porCodigo) return [porCodigo];
    }
    if (digitos.length >= 11) {
      const porDocumento = await this.porDocumento(tenantId, digitos);
      if (porDocumento) return [porDocumento];
    }
    const [primeiro, ...demais] = searchTerms(limpo).slice(0, 10);
    if (!primeiro) return [];
    const result = await this.colecao(tenantId)
      .where('searchTokens', 'array-contains', primeiro)
      .limit(Math.max(limite * 3, 60))
      .get();
    return result.docs
      .map((doc: QueryDocumentSnapshot) => doc.data() as FornecedorGravado)
      .filter((gravado) => demais.every((parte) => gravado.searchTokens?.includes(parte)))
      .map(doGravado)
      .sort((a, b) => a.legalName.localeCompare(b.legalName, 'pt-BR'))
      .slice(0, limite);
  }

  /** Todos do tenant, para agregação interna (inteligência de estoque). */
  async todos(tenantId: string, limite = 5000): Promise<Supplier[]> {
    const snapshot = await this.colecao(tenantId).limit(limite).get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doGravado(doc.data()));
  }

  /** Grava o fornecedor novo com o próximo código. CNPJ/CPF repetido é
   *  recusado dentro da mesma transação que grava. */
  async criar(fornecedor: Supplier): Promise<Supplier> {
    const { tenantId } = fornecedor;
    const referencia = this.colecao(tenantId).doc(fornecedor.id);
    const contador = this.db.doc(`tenants/${tenantId}/contadores/${CONTADOR}`);
    return this.db.runTransaction(async (transacao) => {
      await this.recusarDocumentoRepetido(transacao, tenantId, fornecedor.taxId, fornecedor.id);
      const lido = await transacao.get(contador);
      const codigo = ((lido.data()?.['ultimo'] as number | undefined) ?? 0) + 1;
      const gravado: Supplier = { ...fornecedor, codigo };
      transacao.set(contador, { ultimo: codigo });
      transacao.create(referencia, comIndice(gravado));
      return gravado;
    });
  }

  async atualizar(fornecedor: Supplier): Promise<Supplier> {
    const referencia = this.colecao(fornecedor.tenantId).doc(fornecedor.id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Fornecedor não encontrado');
      await this.recusarDocumentoRepetido(
        transacao,
        fornecedor.tenantId,
        fornecedor.taxId,
        fornecedor.id,
      );
      transacao.set(referencia, comIndice(fornecedor));
      return fornecedor;
    });
  }

  private async recusarDocumentoRepetido(
    transacao: Transaction,
    tenantId: string,
    documento: string,
    id: string,
  ): Promise<void> {
    if (!documento) return;
    const iguais = await transacao.get(
      this.colecao(tenantId).where('taxId', '==', documento).limit(2),
    );
    const outro = iguais.docs.find((doc: QueryDocumentSnapshot) => doc.id !== id);
    if (outro) {
      const dono = doGravado(outro.data());
      throw new ConflictException(
        `Já existe fornecedor com este documento: ${dono.codigo ? `${dono.codigo} - ` : ''}${dono.legalName}`,
      );
    }
  }
}
