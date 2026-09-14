/** Firestore de mentira, so o suficiente para os repositorios de IAM.
 *
 *  O ponto nao e imitar o Firestore: e registrar todo caminho tocado, para o
 *  teste de vazamento poder afirmar que um repositorio de um tenant nunca
 *  encosta no caminho de outro. */

export interface RegistroDeAcesso {
  readonly operacao: 'get' | 'set' | 'update' | 'query' | 'create' | 'delete';
  readonly path: string;
}

type Documento = Record<string, unknown>;

const combina = (valor: unknown, operador: string, comparado: unknown): boolean => {
  if (operador === '==') return valor === comparado || (valor == null && comparado == null);
  if (operador === 'in') return Array.isArray(comparado) && comparado.includes(valor);
  if (operador === 'array-contains-any')
    return (
      Array.isArray(valor) &&
      Array.isArray(comparado) &&
      comparado.some((item: unknown) => valor.includes(item))
    );
  throw new Error(`Operador nao suportado no fake: ${operador}`);
};

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

  doc(path: string) {
    const documentos = this.documentos;
    const registrar = this.registrar.bind(this);

    return {
      path,
      get ref() {
        return this;
      },
      get: () => {
        registrar('get', path);
        const dados = documentos.get(path);
        return Promise.resolve({
          exists: dados !== undefined,
          id: path.split('/').pop(),
          data: () => dados,
        });
      },
      set: (dados: Documento) => {
        registrar('set', path);
        documentos.set(path, { ...dados });
        return Promise.resolve();
      },
      create: (dados: Documento) => {
        this.registrar('create', path);
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
    };
  }

  collection(path: string) {
    const construirConsulta = (
      filtros: readonly { campo: string; operador: string; valor: unknown }[],
      limite = Infinity,
    ) => ({
      where: (campo: string, operador: string, valor: unknown) =>
        construirConsulta([...filtros, { campo, operador, valor }], limite),
      orderBy: () => construirConsulta(filtros, limite),
      limit: (quantidade: number) => construirConsulta(filtros, quantidade),
      get: () => {
        this.registrar('query', path);
        const docs = [...this.documentos.entries()]
          .filter(([caminho]) => {
            const resto = caminho.startsWith(`${path}/`) ? caminho.slice(path.length + 1) : null;
            return resto !== null && !resto.includes('/');
          })
          .filter(([caminho, dados]) =>
            filtros.every(({ campo, operador, valor }) =>
              combina(
                campo === '__name__' ? caminho.split('/').pop() : dados[campo],
                operador,
                valor,
              ),
            ),
          )
          .slice(0, limite)
          .map(([caminho, dados]) => ({
            id: caminho.split('/').pop(),
            ref: this.doc(caminho),
            data: () => dados,
          }));
        return Promise.resolve({ docs, empty: docs.length === 0, size: docs.length });
      },
    });

    return { ...construirConsulta([]), doc: (id: string) => this.doc(`${path}/${id}`) };
  }

  batch() {
    const operacoes: (() => Promise<unknown>)[] = [];
    return {
      update: (ref: { update: (campos: Documento) => Promise<void> }, campos: Documento) => {
        operacoes.push(() => ref.update(campos));
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
      set: (data: Documento) => Promise<void>;
      create: (data: Documento) => Promise<void>;
      update: (data: Documento) => Promise<void>;
      delete: () => Promise<void>;
    };
    const transaction = {
      get: (reference: { get: () => Promise<unknown> }) => reference.get(),
      set: (reference: Referencia, data: Documento) => {
        escritas.push(() => reference.set(data));
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
