/** Firestore de mentira, so o suficiente para os repositorios de IAM.
 *
 *  O ponto nao e imitar o Firestore: e registrar todo caminho tocado, para o
 *  teste de vazamento poder afirmar que um repositorio de um tenant nunca
 *  encosta no caminho de outro. */

export interface RegistroDeAcesso {
  readonly operacao: 'get' | 'set' | 'update' | 'query';
  readonly path: string;
}

type Documento = Record<string, unknown>;

const combina = (valor: unknown, operador: string, comparado: unknown): boolean => {
  if (operador === '==') return valor === comparado || (valor == null && comparado == null);
  if (operador === 'in') return Array.isArray(comparado) && comparado.includes(valor);
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
      update: (campos: Documento) => {
        registrar('update', path);
        const atual = documentos.get(path);
        if (!atual) return Promise.reject(new Error(`Documento inexistente: ${path}`));
        documentos.set(path, { ...atual, ...campos });
        return Promise.resolve();
      },
    };
  }

  collection(path: string) {
    const construirConsulta = (
      filtros: readonly { campo: string; operador: string; valor: unknown }[],
    ) => ({
      where: (campo: string, operador: string, valor: unknown) =>
        construirConsulta([...filtros, { campo, operador, valor }]),
      orderBy: () => construirConsulta(filtros),
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
}
