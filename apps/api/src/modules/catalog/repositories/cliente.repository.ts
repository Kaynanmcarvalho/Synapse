import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Firestore, QueryDocumentSnapshot, Transaction } from '@synapse/firebase/admin';
import type { Customer, PaginaDeClientes, SugestoesDoCadastro } from '@synapse/types';
import { searchTerms, searchTokens } from '../../../common/search/search-tokens';
import { FIREBASE_FIRESTORE } from '../../iam/firebase.tokens';

/** O cadastro de clientes, em `tenants/{t}/customers`.
 *
 *  É o único lugar onde cliente é gravado. Antes havia duas verdades — um `Map`
 *  em memória no catálogo (que sumia no restart e não enxergava o cliente do
 *  balcão) e o documento do Firestore que a análise de crédito lia. Agora a
 *  tela de cadastro, o PDV, a busca global, a NF-e, a carteira do vendedor e o
 *  crédito leem deste mesmo documento.
 *
 *  A busca por prefixo usa `searchTokens`, como os títulos: o Firestore não tem
 *  "contém", então o prefixo de cada palavra vira token no documento. */

const COLECAO = 'customers';
const CONTADOR = 'customers';
/** Documento que marca o tenant como indexado (ver `indexarAntigos`). */
const INDICE = 'customers-indice';
/** Uma página da reindexação cabe num lote de escrita (limite de 500). */
const PAGINA_DA_REINDEXACAO = 400;

/** O que entra no índice de busca: nome, razão social, documento, telefones,
 *  código e cidade — o que o balcão digita para achar alguém. Cadastro antigo
 *  pode não ter telefone nem endereço: o que falta fica de fora. */
const textoDeBusca = (cliente: Customer): string =>
  [
    cliente.name ?? '',
    cliente.legalName ?? '',
    cliente.taxId ?? '',
    cliente.codigo ?? '',
    cliente.telefones?.principal ?? cliente.phone ?? '',
    cliente.telefones?.celular ?? '',
    cliente.email ?? '',
    cliente.address?.city ?? '',
  ].join(' ');

const ENDERECO_VAZIO: Customer['address'] = {
  street: '',
  number: '',
  complement: null,
  district: '',
  city: '',
  state: '',
  postalCode: '',
};

/** Cadastro gravado antes desta tela (seed, tela antiga do crédito, massa de
 *  volume) pode não ter tipo, situação, "ativo", saldo, telefone ou endereço.
 *  Quem lê recebe o padrão da tela em vez de `undefined`: a carteira do
 *  vendedor, a análise de crédito e a janela usam esses campos direto. Versão
 *  e autoria ficam de fora — "não registrado" não é um valor, e o serviço trata. */
const comPadroes = (gravado: Customer): Customer => ({
  ...gravado,
  type: gravado.type ?? (gravado.taxId?.length === 11 ? 'PF' : 'PJ'),
  phone: gravado.phone ?? '',
  address: { ...ENDERECO_VAZIO, ...gravado.address },
  creditLimit: gravado.creditLimit ?? 0,
  openCredit: gravado.openCredit ?? 0,
  financialStatus: gravado.financialStatus ?? 'REGULAR',
  active: gravado.active ?? true,
});

@Injectable()
export class ClienteRepository {
  constructor(@Inject(FIREBASE_FIRESTORE) private readonly db: Firestore) {}

  private colecao(tenantId: string) {
    return this.db.collection(`tenants/${tenantId}/${COLECAO}`);
  }

  private dados(snapshot: { docs: QueryDocumentSnapshot[] }): Customer[] {
    return snapshot.docs.map((documento) => comPadroes(documento.data() as Customer));
  }

  async buscar(tenantId: string, id: string): Promise<Customer | null> {
    const documento = await this.colecao(tenantId).doc(id).get();
    return documento.exists ? comPadroes(documento.data() as Customer) : null;
  }

  /** Vários de uma vez, numa ida só ao banco: a fila do crédito e a carteira do
   *  vendedor precisam de dezenas de clientes por tela. */
  async buscarVarios(
    tenantId: string,
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, Customer>> {
    const unicos = [...new Set(ids)].filter(Boolean);
    if (unicos.length === 0) return new Map();
    const documentos = await this.db.getAll(...unicos.map((id) => this.colecao(tenantId).doc(id)));
    return new Map(
      documentos.flatMap((documento) =>
        documento.exists ? [[documento.id, comPadroes(documento.data() as Customer)]] : [],
      ),
    );
  }

  /** Clientes do tenant em ordem de nome, paginando por cursor (o id do último
   *  lido). Não ordena pela data de criação: cadastro gravado antes desta tela
   *  não tem `createdAt`, e o Firestore deixa de fora da consulta o documento
   *  que não tem o campo ordenado. */
  async listar(
    tenantId: string,
    opcoes: { readonly limite: number; readonly cursor?: string | null },
  ): Promise<PaginaDeClientes> {
    let consulta = this.colecao(tenantId)
      .orderBy('name')
      .limit(opcoes.limite + 1);
    if (opcoes.cursor) {
      const ancora = await this.colecao(tenantId).doc(opcoes.cursor).get();
      if (ancora.exists) consulta = consulta.startAfter(ancora);
    }
    const lidos = this.dados(await consulta.get());
    const pagina = lidos.slice(0, opcoes.limite);
    return {
      itens: pagina.map(paraLista),
      proximoCursor: lidos.length > opcoes.limite ? (pagina.at(-1)?.id ?? null) : null,
      total: null,
    };
  }

  /** Busca por prefixo de palavra ou por documento. Vazia, devolve a lista. */
  async procurar(tenantId: string, termo: string, limite: number): Promise<readonly Customer[]> {
    const limpo = termo.trim();
    if (!limpo) return this.dados(await this.colecao(tenantId).limit(limite).get());

    const digitos = limpo.replace(/\D/g, '');
    if (digitos.length >= 3) {
      const porDocumento = this.dados(
        await this.colecao(tenantId).where('taxId', '==', digitos).limit(limite).get(),
      );
      if (porDocumento.length > 0) return porDocumento;
    }
    const [termoDeBusca] = searchTerms(limpo);
    if (!termoDeBusca) return [];
    const indexados = this.dados(
      await this.colecao(tenantId)
        .where('searchTokens', 'array-contains', termoDeBusca)
        .limit(limite)
        .get(),
    );
    if (indexados.length > 0 || (await this.indiceCompleto(tenantId))) return indexados;
    const todos = await this.indexarAntigos(tenantId);
    return todos
      .filter((cliente) => searchTokens(textoDeBusca(cliente)).includes(termoDeBusca))
      .slice(0, limite);
  }

  /** Cliente com este CPF/CNPJ, se houver. Dois cadastros do mesmo documento
   *  viram dois limites de crédito para a mesma pessoa. */
  async porDocumento(tenantId: string, taxId: string): Promise<Customer | null> {
    const encontrados = await this.colecao(tenantId).where('taxId', '==', taxId).limit(1).get();
    return this.dados(encontrados)[0] ?? null;
  }

  /** Tudo do tenant, sem paginar: agregação interna (carteira, indicadores). */
  async todos(tenantId: string, limite = 5000): Promise<readonly Customer[]> {
    return this.dados(await this.colecao(tenantId).limit(limite).get());
  }

  /** Grava o cliente novo, com o código sequencial e o índice de busca. O
   *  documento único é conferido dentro da transação que grava. */
  async criar(cliente: Customer): Promise<Customer> {
    const { tenantId } = cliente;
    const referencia = this.colecao(tenantId).doc(cliente.id);
    const contador = this.db.doc(`tenants/${tenantId}/contadores/${CONTADOR}`);
    return this.db.runTransaction(async (transacao) => {
      await this.recusarDocumentoRepetido(transacao, tenantId, cliente.taxId, cliente.id);
      const lido = await transacao.get(contador);
      const ultimo = (lido.data()?.['ultimo'] as number | undefined) ?? 0;
      const numero = ultimo + 1;
      const gravado: Customer = { ...cliente, codigo: cliente.codigo ?? codigoDe(numero) };
      transacao.set(contador, { ultimo: numero });
      transacao.create(referencia, comIndice(gravado));
      return gravado;
    });
  }

  /** Atualiza o cadastro inteiro. Mantém o que a tela não edita (código, datas
   *  de criação) e reescreve o índice de busca. */
  async atualizar(cliente: Customer): Promise<Customer> {
    const referencia = this.colecao(cliente.tenantId).doc(cliente.id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Cliente não encontrado');
      await this.recusarDocumentoRepetido(transacao, cliente.tenantId, cliente.taxId, cliente.id);
      transacao.set(referencia, comIndice(cliente));
      return cliente;
    });
  }

  /** Alteração parcial vinda de outra tela (situação financeira, limite). */
  async alterar(
    tenantId: string,
    id: string,
    mudar: (cliente: Customer) => Customer,
  ): Promise<Customer> {
    const referencia = this.colecao(tenantId).doc(id);
    return this.db.runTransaction(async (transacao) => {
      const atual = await transacao.get(referencia);
      if (!atual.exists) throw new NotFoundException('Cliente não encontrado');
      const alterado = mudar(comPadroes(atual.data() as Customer));
      transacao.set(referencia, comIndice(alterado));
      return alterado;
    });
  }

  /** Valores já usados, para o cadastro sugerir em vez de exigir digitação
   *  igualzinha. O Synapse ainda não tem cadastro de grupo, praça e segmento. */
  async sugestoes(tenantId: string): Promise<SugestoesDoCadastro> {
    const clientes = await this.todos(tenantId, 2000);
    const juntar = (valores: readonly (string | null | undefined)[]) =>
      [...new Set(valores.filter((valor): valor is string => Boolean(valor?.trim())))].sort(
        (a, b) => a.localeCompare(b, 'pt-BR'),
      );
    return {
      grupos: juntar(clientes.map((c) => c.classificacao?.grupo)),
      subGrupos: juntar(clientes.map((c) => c.classificacao?.subGrupo)),
      pracas: juntar(clientes.map((c) => c.classificacao?.pracaOuRegiao)),
      segmentos: juntar(clientes.map((c) => c.pessoaJuridica?.segmento)),
      ramosDeAtividade: juntar(clientes.map((c) => c.pessoaJuridica?.ramoDeAtividade)),
    };
  }

  private async indiceCompleto(tenantId: string): Promise<boolean> {
    const marca = await this.db.doc(`tenants/${tenantId}/contadores/${INDICE}`).get();
    return marca.get('completo') === true;
  }

  /** Cadastro gravado antes do índice — pelo seed ou pela tela antiga do
   *  crédito — não tem `searchTokens`, e a consulta por token não o acha. Na
   *  primeira busca sem resultado, lê a carteira em páginas, grava o índice em
   *  quem não tem e marca o tenant: dali em diante, busca sem resultado custa
   *  uma leitura. Só `searchTokens` é gravado, e só se o documento não mudou
   *  desde a leitura — nada do cadastro é reescrito com dado velho. */
  private async indexarAntigos(tenantId: string): Promise<readonly Customer[]> {
    const lidos: Customer[] = [];
    let completo = true;
    let ultimo: QueryDocumentSnapshot | undefined;
    for (;;) {
      const consulta = this.colecao(tenantId).limit(PAGINA_DA_REINDEXACAO);
      const { docs } = await (ultimo ? consulta.startAfter(ultimo) : consulta).get();
      const semIndice = docs.filter((documento) => !Array.isArray(documento.get('searchTokens')));
      if (semIndice.length > 0) {
        const lote = this.db.batch();
        for (const documento of semIndice) {
          const searchTokensDoCliente = searchTokens(textoDeBusca(documento.data() as Customer));
          lote.update(
            documento.ref,
            { searchTokens: searchTokensDoCliente },
            { lastUpdateTime: documento.updateTime },
          );
        }
        // Alguém salvou um desses clientes no meio do caminho: a tela já gravou
        // o índice certo. Esta página fica para a próxima busca sem resultado.
        await lote.commit().catch(() => {
          completo = false;
        });
      }
      lidos.push(...this.dados({ docs }));
      ultimo = docs.at(-1);
      if (docs.length < PAGINA_DA_REINDEXACAO) break;
    }
    if (completo) {
      await this.db
        .doc(`tenants/${tenantId}/contadores/${INDICE}`)
        .set({ completo: true, em: new Date().toISOString() });
    }
    return lidos;
  }

  private async recusarDocumentoRepetido(
    transacao: Transaction,
    tenantId: string,
    taxId: string,
    id: string,
  ): Promise<void> {
    const iguais = await transacao.get(this.colecao(tenantId).where('taxId', '==', taxId).limit(2));
    const outro = iguais.docs.find((documento) => documento.id !== id);
    if (outro) {
      const dono = outro.data() as Customer;
      throw new ConflictException(
        `Já existe cliente com este CPF/CNPJ: ${dono.codigo ? `${dono.codigo} · ` : ''}${dono.name}`,
      );
    }
  }
}

/** "C-0042": o código que o balcão fala no telefone. */
export const codigoDe = (numero: number): string => `C-${String(numero).padStart(4, '0')}`;

/** O documento gravado leva o índice de busca junto. */
const comIndice = (cliente: Customer) => ({
  ...cliente,
  searchTokens: searchTokens(textoDeBusca(cliente)),
});

/** A linha da lista: o suficiente para achar e decidir, sem trafegar a ficha.
 *  Passa pelos padrões da leitura, para cadastro antigo virar linha completa. */
export const paraLista = (gravado: Customer): PaginaDeClientes['itens'][number] => {
  const cliente = comPadroes(gravado);
  return {
    id: cliente.id,
    tenantId: cliente.tenantId,
    codigo: cliente.codigo ?? null,
    nome: cliente.name,
    razaoSocial: cliente.legalName ?? null,
    documento: cliente.taxId,
    tipo: cliente.type,
    cidade: cliente.address.city,
    uf: cliente.address.state,
    telefone: cliente.telefones?.principal ?? cliente.phone,
    limiteCentavos: cliente.creditLimit,
    situacao: cliente.financialStatus,
    ativo: cliente.active,
    grupo: cliente.classificacao?.grupo ?? null,
    vendedorNome: null,
    atualizadoEm: cliente.updatedAt ?? null,
  };
};
