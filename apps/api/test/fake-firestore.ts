/** Firestore de mentira, so o suficiente para os repositorios.
 *
 *  O ponto nao e imitar o Firestore: e registrar todo caminho tocado, para o
 *  teste de vazamento poder afirmar que um repositorio de um tenant nunca
 *  encosta no caminho de outro. Consultas cobrem o que os repositorios usam:
 *  filtros, ordenacao, `startAfter` e `limit`. */

export interface RegistroDeAcesso {
  readonly operacao: 'get' | 'set' | 'update' | 'query' | 'create' | 'delete';
  readonly path: string;
}

type Documento = Record<string, unknown>;

interface Filtro {
  readonly campo: string;
  readonly operador: string;
  readonly valor: unknown;
}

interface Ordem {
  readonly campo: string;
  readonly direcao: 'asc' | 'desc';
}

const comparar = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : 1;
};

const combina = (valor: unknown, operador: string, comparado: unknown): boolean => {
  if (operador === '==') return valor === comparado || (valor == null && comparado == null);
  if (operador === '!=') return valor !== comparado;
  if (operador === 'in') return Array.isArray(comparado) && comparado.includes(valor);
  if (operador === 'array-contains') return Array.isArray(valor) && valor.includes(comparado);
  if (operador === 'array-contains-any')
    return (
      Array.isArray(valor) &&
      Array.isArray(comparado) &&
      comparado.some((item: unknown) => valor.includes(item))
    );
  if (valor === undefined || valor === null) return false;
  if (operador === '>=') return comparar(valor, comparado) >= 0;
  if (operador === '>') return comparar(valor, comparado) > 0;
  if (operador === '<=') return comparar(valor, comparado) <= 0;
  if (operador === '<') return comparar(valor, comparado) < 0;
  throw new Error(`Operador nao suportado no fake: ${operador}`);
};

const campoDe = (caminho: string, dados: Documento, campo: string): unknown =>
  campo === '__name__'
    ? caminho.split('/').pop()
    : campo.split('.').reduce<unknown>((atual, parte) => (atual as Documento)?.[parte], dados);

export class FakeFirestore {
  readonly acessos: RegistroDeAcesso[] = [];
  private readonly documentos = new Map<string, Documento>();

  semear(path: string, dados: Documento): void {
    this.documentos.set(path, dados);
  }

  conteudo(path: string): Documento | undefined {
    return this.documentos.get(path);
  }

  /** Os caminhos tocados, sem repetir, na ordem em que apareceram. */
  get caminhosTocados(): string[] {
    return [...new Set(this.acessos.map((acesso) => acesso.path))];
  }

  private registrar(operacao: RegistroDeAcesso['operacao'], path: string): void {
    this.acessos.push({ operacao, path });
  }

  private instantaneo(path: string) {
    const dados = this.documentos.get(path);
    return {
      exists: dados !== undefined,
      id: path.split('/').pop() ?? '',
      ref: this.doc(path),
      updateTime: undefined,
      data: () => dados,
      get: (campo: string) => (dados ? campoDe(path, dados, campo) : undefined),
    };
  }

  doc(path: string) {
    const documentos = this.documentos;
    const registrar = this.registrar.bind(this);
    const instantaneo = this.instantaneo.bind(this);

    return {
      path,
      id: path.split('/').pop() ?? '',
      get ref() {
        return this;
      },
      get: () => {
        registrar('get', path);
        return Promise.resolve(instantaneo(path));
      },
      set: (dados: Documento, opcoes?: { merge?: boolean }) => {
        registrar('set', path);
        const atual = documentos.get(path);
        documentos.set(path, opcoes?.merge && atual ? { ...atual, ...dados } : { ...dados });
        return Promise.resolve();
      },
      create: (dados: Documento) => {
        registrar('create', path);
        if (documentos.has(path)) {
          const error = new Error(`Documento já existe: ${path}`) as Error & { code?: number };
          error.code = 6;
          return Promise.reject(error);
        }
        documentos.set(path, { ...dados });
        return Promise.resolve();
      },
      update: (campos: Documento) => {
        registrar('update', path);
        const atual = documentos.get(path);
        if (!atual) return Promise.reject(new Error(`Documento inexistente: ${path}`));
        documentos.set(path, { ...atual, ...campos });
        return Promise.resolve();
      },
      delete: () => {
        registrar('delete', path);
        documentos.delete(path);
        return Promise.resolve();
      },
      collection: (sub: string) => this.collection(`${path}/${sub}`),
    };
  }

  collection(path: string) {
    const construirConsulta = (
      filtros: readonly Filtro[],
      ordens: readonly Ordem[],
      limite: number,
      depoisDe: unknown,
    ) => ({
      where: (campo: string, operador: string, valor: unknown) =>
        construirConsulta([...filtros, { campo, operador, valor }], ordens, limite, depoisDe),
      orderBy: (campo: string, direcao: 'asc' | 'desc' = 'asc') =>
        construirConsulta(filtros, [...ordens, { campo, direcao }], limite, depoisDe),
      limit: (quantidade: number) => construirConsulta(filtros, ordens, quantidade, depoisDe),
      startAfter: (ancora: unknown) => construirConsulta(filtros, ordens, limite, ancora),
      get: () => {
        this.registrar('query', path);
        let linhas = [...this.documentos.entries()]
          .filter(([caminho]) => {
            const resto = caminho.startsWith(`${path}/`) ? caminho.slice(path.length + 1) : null;
            return resto !== null && !resto.includes('/');
          })
          .filter(([caminho, dados]) =>
            filtros.every(({ campo, operador, valor }) =>
              combina(campoDe(caminho, dados, campo), operador, valor),
            ),
          );
        if (ordens.length > 0) {
          linhas = linhas
            .filter(([caminho, dados]) =>
              ordens.every(({ campo }) => campoDe(caminho, dados, campo) !== undefined),
            )
            .sort(([caminhoA, a], [caminhoB, b]) => {
              for (const { campo, direcao } of ordens) {
                const diferenca = comparar(
                  campoDe(caminhoA, a, campo),
                  campoDe(caminhoB, b, campo),
                );
                if (diferenca !== 0) return direcao === 'asc' ? diferenca : -diferenca;
              }
              return comparar(caminhoA, caminhoB);
            });
        }
        if (depoisDe !== undefined) {
          const id =
            typeof depoisDe === 'object' && depoisDe !== null && 'id' in depoisDe
              ? String((depoisDe as { id: string }).id)
              : null;
          const indice = id
            ? linhas.findIndex(([caminho]) => caminho.split('/').pop() === id)
            : linhas.findIndex(
                ([caminho, dados]) =>
                  comparar(campoDe(caminho, dados, ordens[0]?.campo ?? '__name__'), depoisDe) > 0,
              ) - 1;
          linhas = linhas.slice(indice + 1);
        }
        const docs = linhas.slice(0, limite).map(([caminho]) => this.instantaneo(caminho));
        return Promise.resolve({ docs, empty: docs.length === 0, size: docs.length });
      },
    });

    return {
      ...construirConsulta([], [], Infinity, undefined),
      path,
      doc: (id?: string) => this.doc(`${path}/${id ?? Math.random().toString(36).slice(2)}`),
    };
  }

  getAll(...referencias: { path: string }[]) {
    return Promise.all(
      referencias.map((referencia) => {
        this.registrar('get', referencia.path);
        return this.instantaneo(referencia.path);
      }),
    );
  }

  batch() {
    const operacoes: (() => Promise<unknown>)[] = [];
    type Referencia = {
      set: (data: Documento, opcoes?: { merge?: boolean }) => Promise<void>;
      create: (data: Documento) => Promise<void>;
      update: (data: Documento) => Promise<void>;
      delete: () => Promise<void>;
    };
    return {
      set: (ref: Referencia, dados: Documento, opcoes?: { merge?: boolean }) => {
        operacoes.push(() => ref.set(dados, opcoes));
      },
      create: (ref: Referencia, dados: Documento) => {
        operacoes.push(() => ref.create(dados));
      },
      update: (ref: Referencia, campos: Documento) => {
        operacoes.push(() => ref.update(campos));
      },
      delete: (ref: Referencia) => {
        operacoes.push(() => ref.delete());
      },
      commit: async () => {
        for (const operacao of operacoes) await operacao();
      },
    };
  }

  /** Como no Firestore: as escritas so valem no fim, e um `create` sobre
   *  documento existente derruba a transacao em vez de sobrescrever. Nao simula
   *  concorrencia — isso fica para os testes no emulador. */
  async runTransaction<T>(operation: (transaction: unknown) => Promise<T>): Promise<T> {
    const escritas: (() => Promise<unknown>)[] = [];
    type Referencia = {
      set: (data: Documento, opcoes?: { merge?: boolean }) => Promise<void>;
      create: (data: Documento) => Promise<void>;
      update: (data: Documento) => Promise<void>;
      delete: () => Promise<void>;
    };
    const transaction = {
      get: (reference: { get: () => Promise<unknown> }) => reference.get(),
      getAll: (...referencias: { path: string }[]) => this.getAll(...referencias),
      set: (reference: Referencia, data: Documento, opcoes?: { merge?: boolean }) => {
        escritas.push(() => reference.set(data, opcoes));
      },
      create: (reference: Referencia, data: Documento) => {
        escritas.push(() => reference.create(data));
      },
      update: (reference: Referencia, data: Documento) => {
        escritas.push(() => reference.update(data));
      },
      delete: (reference: Referencia) => {
        escritas.push(() => reference.delete());
      },
    };
    const resultado = await operation(transaction);
    for (const escrita of escritas) await escrita();
    return resultado;
  }
}
