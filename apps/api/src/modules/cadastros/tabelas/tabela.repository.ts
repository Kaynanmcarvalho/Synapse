import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot, Transaction } from '@synapse/firebase/admin';
import type { ItemDeTabela, MeioDePagamento, TipoDeTabela } from '@synapse/types';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

/** Itens que toda empresa ganha na primeira leitura da tabela — os mesmos com
 *  que o Syndata nasce. "1 - GERAL" é o padrão de toda ficha nova. */
const PADROES: Readonly<Record<TipoDeTabela, readonly { nome: string; meio?: MeioDePagamento }[]>> =
  {
    cargos: [{ nome: 'GERAL' }],
    departamentos: [{ nome: 'GERAL' }],
    pracas: [{ nome: 'GERAL' }],
    'grupos-de-fornecedor': [{ nome: 'GERAL' }],
    'subgrupos-de-fornecedor': [{ nome: 'GERAL' }],
    'formas-de-pagamento': [
      { nome: 'DINHEIRO', meio: 'DINHEIRO' },
      { nome: 'PIX', meio: 'PIX' },
      { nome: 'CARTÃO DE DÉBITO', meio: 'CARTAO_DEBITO' },
      { nome: 'CARTÃO DE CRÉDITO', meio: 'CARTAO_CREDITO' },
      { nome: 'BOLETO', meio: 'BOLETO' },
      { nome: 'A PRAZO', meio: 'A_PRAZO' },
      { nome: 'BONIFICAÇÃO', meio: 'BONIFICACAO' },
    ],
  };

export interface DadosDoItem {
  readonly nome: string;
  readonly ativo: boolean;
  readonly meio?: MeioDePagamento | undefined;
}

/** Tabelas auxiliares em `tenants/{t}/tabelas/{tipo}/itens/{codigo}`, com o
 *  último código em `contadores/tabela-{tipo}`. O código é o id do documento:
 *  a ficha que guarda "praça 3" acha a praça sem consulta. */
@Injectable()
export class TabelaRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private itens(tenantId: string, tipo: TipoDeTabela) {
    return this.db.collection(`tenants/${tenantId}/tabelas/${tipo}/itens`);
  }

  private contador(tenantId: string, tipo: TipoDeTabela) {
    return this.db.doc(`tenants/${tenantId}/contadores/tabela-${tipo}`);
  }

  async listar(tenantId: string, tipo: TipoDeTabela): Promise<ItemDeTabela[]> {
    const lidos = await this.lerTodos(tenantId, tipo);
    if (lidos.length > 0) return lidos;
    await this.semear(tenantId, tipo);
    return this.lerTodos(tenantId, tipo);
  }

  async buscar(tenantId: string, tipo: TipoDeTabela, codigo: number): Promise<ItemDeTabela | null> {
    await this.garantirSemeada(tenantId, tipo);
    const snapshot = await this.itens(tenantId, tipo).doc(String(codigo)).get();
    return snapshot.exists ? (snapshot.data() as ItemDeTabela) : null;
  }

  async criar(
    tenantId: string,
    tipo: TipoDeTabela,
    dados: DadosDoItem,
    autor: string,
  ): Promise<ItemDeTabela> {
    await this.garantirSemeada(tenantId, tipo);
    return this.db.runTransaction(async (transacao) => {
      await this.recusarNomeRepetido(transacao, tenantId, tipo, dados.nome, null);
      const lido = await transacao.get(this.contador(tenantId, tipo));
      const codigo = ((lido.data()?.['ultimo'] as number | undefined) ?? 0) + 1;
      const agora = new Date().toISOString();
      const item: ItemDeTabela = {
        tipo,
        codigo,
        nome: dados.nome,
        ativo: dados.ativo,
        ...(tipo === 'formas-de-pagamento' ? { meio: dados.meio ?? 'OUTROS' } : {}),
        criadoEm: agora,
        atualizadoEm: agora,
        criadoPor: autor,
        atualizadoPor: autor,
      };
      transacao.set(this.contador(tenantId, tipo), { ultimo: codigo, semeada: true });
      transacao.create(this.itens(tenantId, tipo).doc(String(codigo)), item);
      return item;
    });
  }

  async alterar(
    tenantId: string,
    tipo: TipoDeTabela,
    codigo: number,
    dados: DadosDoItem,
    autor: string,
  ): Promise<ItemDeTabela> {
    const referencia = this.itens(tenantId, tipo).doc(String(codigo));
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Item não encontrado');
      await this.recusarNomeRepetido(transacao, tenantId, tipo, dados.nome, codigo);
      const anterior = atual.data() as ItemDeTabela;
      const alterado: ItemDeTabela = {
        ...anterior,
        nome: dados.nome,
        ativo: dados.ativo,
        ...(tipo === 'formas-de-pagamento'
          ? { meio: dados.meio ?? anterior.meio ?? 'OUTROS' }
          : {}),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: autor,
      };
      transacao.set(referencia, alterado);
      return alterado;
    });
  }

  private async lerTodos(tenantId: string, tipo: TipoDeTabela): Promise<ItemDeTabela[]> {
    const snapshot = await this.itens(tenantId, tipo).orderBy('codigo').get();
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as ItemDeTabela);
  }

  private async garantirSemeada(tenantId: string, tipo: TipoDeTabela): Promise<void> {
    const marca = await this.contador(tenantId, tipo).get();
    if (!marca.exists) await this.semear(tenantId, tipo);
  }

  /** Grava os itens padrão uma vez só: o contador marca a tabela como semeada,
   *  e duas telas abrindo ao mesmo tempo disputam o mesmo documento. */
  private async semear(tenantId: string, tipo: TipoDeTabela): Promise<void> {
    await this.db.runTransaction(async (transacao) => {
      const marca = await transacao.get(this.contador(tenantId, tipo));
      if (marca.exists) return;
      const agora = new Date().toISOString();
      PADROES[tipo].forEach((padrao, indice) => {
        const codigo = indice + 1;
        const item: ItemDeTabela = {
          tipo,
          codigo,
          nome: padrao.nome,
          ativo: true,
          ...(padrao.meio ? { meio: padrao.meio } : {}),
          criadoEm: agora,
          atualizadoEm: agora,
          criadoPor: null,
          atualizadoPor: null,
        };
        transacao.set(this.itens(tenantId, tipo).doc(String(codigo)), item);
      });
      transacao.set(this.contador(tenantId, tipo), {
        ultimo: PADROES[tipo].length,
        semeada: true,
      });
    });
  }

  private async recusarNomeRepetido(
    transacao: Transaction,
    tenantId: string,
    tipo: TipoDeTabela,
    nome: string,
    codigo: number | null,
  ): Promise<void> {
    const iguais = await transacao.get(
      this.itens(tenantId, tipo).where('nome', '==', nome).limit(2),
    );
    const outro = iguais.docs.find(
      (doc: QueryDocumentSnapshot) => (doc.data() as ItemDeTabela).codigo !== codigo,
    );
    if (outro) {
      const dono = outro.data() as ItemDeTabela;
      throw new ConflictException(`Já existe "${dono.nome}" com o código ${dono.codigo}`);
    }
  }
}
