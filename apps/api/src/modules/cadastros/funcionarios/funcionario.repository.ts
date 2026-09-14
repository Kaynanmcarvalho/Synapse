import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot, Transaction } from '@synapse/firebase/admin';
import type { Funcionario, FuncionarioNaLista, PaginaDeFuncionarios } from '@synapse/types';
import { searchTerms, searchTokens } from '../../../common/search/search-tokens';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

const COLECAO = 'funcionarios';
const CONTADOR = 'funcionarios';

type FuncionarioGravado = Funcionario & { readonly searchTokens?: readonly string[] };

export interface FotoDoFuncionario {
  readonly tipo: string;
  readonly base64: string;
  readonly atualizadaEm: string;
}

const textoDeBusca = (funcionario: Funcionario): string =>
  [
    funcionario.nome,
    String(funcionario.codigo),
    funcionario.matricula ?? '',
    funcionario.documentos.cpf ?? '',
    funcionario.cargo.nome,
    funcionario.departamento.nome,
    funcionario.telefone ?? '',
    funcionario.celular ?? '',
    funcionario.usuario?.email ?? '',
  ].join(' ');

const doGravado = (dados: unknown): Funcionario => {
  const { searchTokens: _tokens, ...funcionario } = dados as FuncionarioGravado;
  return funcionario;
};

const comIndice = (funcionario: Funcionario) => ({
  ...funcionario,
  searchTokens: searchTokens(textoDeBusca(funcionario)),
});

export const funcionarioNaLista = (funcionario: Funcionario): FuncionarioNaLista => ({
  id: funcionario.id,
  codigo: funcionario.codigo,
  nome: funcionario.nome,
  matricula: funcionario.matricula,
  cargo: funcionario.cargo.nome,
  departamento: funcionario.departamento.nome,
  telefone: funcionario.celular ?? funcionario.telefone,
  vendedor: funcionario.comissao.vendedor,
  bloqueado: funcionario.bloqueado,
  demitido: Boolean(funcionario.demissao && funcionario.demissao <= hoje()),
  usuarioEmail: funcionario.usuario?.email ?? null,
  temFoto: Boolean(funcionario.fotoAtualizadaEm),
});

const hoje = () => new Date().toISOString().slice(0, 10);

/** Funcionários em `tenants/{t}/funcionarios/{id}`; a foto em
 *  `funcionarios/{id}/arquivos/foto`, fora da ficha, para a lista não trafegar
 *  imagem. O código é sequencial por empresa e o CPF, único. */
@Injectable()
export class FuncionarioRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private colecao(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/${COLECAO}`);
  }

  private referenciaDaFoto(tenantId: string, id: string) {
    return this.db.doc(`tenants/${tenantId}/${COLECAO}/${id}/arquivos/foto`);
  }

  async buscar(tenantId: string, id: string): Promise<Funcionario | null> {
    const snapshot = await this.colecao(tenantId).doc(id).get();
    return snapshot.exists ? doGravado(snapshot.data()) : null;
  }

  async porCodigo(tenantId: string, codigo: number): Promise<Funcionario | null> {
    const result = await this.colecao(tenantId).where('codigo', '==', codigo).limit(1).get();
    const [primeiro] = result.docs;
    return primeiro ? doGravado(primeiro.data()) : null;
  }

  async porUsuario(tenantId: string, uid: string): Promise<Funcionario | null> {
    const result = await this.colecao(tenantId).where('usuario.uid', '==', uid).limit(1).get();
    const [primeiro] = result.docs;
    return primeiro ? doGravado(primeiro.data()) : null;
  }

  async listar(
    tenantId: string,
    opcoes: { readonly limite: number; readonly cursor?: string | null },
  ): Promise<PaginaDeFuncionarios> {
    let consulta = this.colecao(tenantId)
      .orderBy('nome')
      .limit(opcoes.limite + 1);
    if (opcoes.cursor) {
      const ancora = await this.colecao(tenantId).doc(opcoes.cursor).get();
      if (ancora.exists) consulta = consulta.startAfter(ancora);
    }
    const lidos = (await consulta.get()).docs.map((doc: QueryDocumentSnapshot) =>
      doGravado(doc.data()),
    );
    const pagina = lidos.slice(0, opcoes.limite);
    return {
      itens: pagina.map(funcionarioNaLista),
      proximoCursor: lidos.length > opcoes.limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  }

  /** Pelo código, pelo CPF ou por prefixo de palavra do nome. */
  async procurar(tenantId: string, termo: string, limite: number): Promise<Funcionario[]> {
    const limpo = termo.trim();
    if (!limpo) {
      const snapshot = await this.colecao(tenantId).orderBy('nome').limit(limite).get();
      return snapshot.docs.map((doc: QueryDocumentSnapshot) => doGravado(doc.data()));
    }
    if (/^\d{1,6}$/.test(limpo)) {
      const porCodigo = await this.porCodigo(tenantId, Number(limpo));
      if (porCodigo) return [porCodigo];
    }
    const [primeiro, ...demais] = searchTerms(limpo).slice(0, 10);
    if (!primeiro) return [];
    const result = await this.colecao(tenantId)
      .where('searchTokens', 'array-contains', primeiro)
      .limit(Math.max(limite * 3, 60))
      .get();
    return result.docs
      .map((doc: QueryDocumentSnapshot) => doc.data() as FuncionarioGravado)
      .filter((gravado) => demais.every((parte) => gravado.searchTokens?.includes(parte)))
      .map(doGravado)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, limite);
  }

  /** Quem pode aparecer no campo Vendedor: marcado como vendedor na comissão. */
  async vendedores(tenantId: string): Promise<Funcionario[]> {
    const result = await this.colecao(tenantId).where('comissao.vendedor', '==', true).get();
    return result.docs
      .map((doc: QueryDocumentSnapshot) => doGravado(doc.data()))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async criar(funcionario: Funcionario): Promise<Funcionario> {
    const { tenantId } = funcionario;
    const referencia = this.colecao(tenantId).doc(funcionario.id);
    const contador = this.db.doc(`tenants/${tenantId}/contadores/${CONTADOR}`);
    return this.db.runTransaction(async (transacao) => {
      await this.recusarCpfRepetido(
        transacao,
        tenantId,
        funcionario.documentos.cpf,
        funcionario.id,
      );
      const lido = await transacao.get(contador);
      const codigo = ((lido.data()?.['ultimo'] as number | undefined) ?? 0) + 1;
      const gravado: Funcionario = { ...funcionario, codigo };
      transacao.set(contador, { ultimo: codigo });
      transacao.create(referencia, comIndice(gravado));
      return gravado;
    });
  }

  async atualizar(funcionario: Funcionario): Promise<Funcionario> {
    const referencia = this.colecao(funcionario.tenantId).doc(funcionario.id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Funcionário não encontrado');
      await this.recusarCpfRepetido(
        transacao,
        funcionario.tenantId,
        funcionario.documentos.cpf,
        funcionario.id,
      );
      transacao.set(referencia, comIndice(funcionario));
      return funcionario;
    });
  }

  /** Alteração parcial (foto, usuário) sem reescrever a ficha com dado velho. */
  async alterar(
    tenantId: string,
    id: string,
    mudar: (funcionario: Funcionario) => Funcionario,
  ): Promise<Funcionario> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Funcionário não encontrado');
      const alterado = mudar(doGravado(atual.data()));
      transacao.set(referencia, comIndice(alterado));
      return alterado;
    });
  }

  async lerFoto(tenantId: string, id: string): Promise<FotoDoFuncionario | null> {
    const snapshot = await this.referenciaDaFoto(tenantId, id).get();
    return snapshot.exists ? (snapshot.data() as FotoDoFuncionario) : null;
  }

  async gravarFoto(tenantId: string, id: string, foto: FotoDoFuncionario): Promise<Funcionario> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Funcionário não encontrado');
      const alterado: Funcionario = {
        ...doGravado(atual.data()),
        fotoAtualizadaEm: foto.atualizadaEm,
      };
      transacao.set(this.referenciaDaFoto(tenantId, id), foto);
      transacao.set(referencia, comIndice(alterado));
      return alterado;
    });
  }

  async removerFoto(tenantId: string, id: string): Promise<Funcionario> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Funcionário não encontrado');
      const alterado: Funcionario = { ...doGravado(atual.data()), fotoAtualizadaEm: null };
      transacao.delete(this.referenciaDaFoto(tenantId, id));
      transacao.set(referencia, comIndice(alterado));
      return alterado;
    });
  }

  private async recusarCpfRepetido(
    transacao: Transaction,
    tenantId: string,
    cpf: string | null,
    id: string,
  ): Promise<void> {
    if (!cpf) return;
    const iguais = await transacao.get(
      this.colecao(tenantId).where('documentos.cpf', '==', cpf).limit(2),
    );
    const outro = iguais.docs.find((doc: QueryDocumentSnapshot) => doc.id !== id);
    if (outro) {
      const dono = doGravado(outro.data());
      throw new ConflictException(
        `Já existe funcionário com este CPF: ${dono.codigo} - ${dono.nome}`,
      );
    }
  }
}
