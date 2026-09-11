export interface SearchDocument {
  readonly id: string;
  readonly text: string;
}

/** §59: "busca global sobre 500 mil clientes e 100 mil produtos não pode
 *  varrer coleção. Precisa de índice de busca." Um índice invertido por
 *  prefixo de palavra: cada token normalizado de um documento é gravado sob
 *  todo prefixo dele (m, ma, mar, mari, marin, marina), então uma busca por
 *  prefixo é uma leitura direta do Map — não uma comparação `.includes()`
 *  contra cada documento. É a peça reaproveitável quando um repositório
 *  migrar pra Firestore: os mesmos tokens viram um campo `searchTokens`
 *  indexado, e a query trafega `array-contains` em vez de escanear tudo. */
export class PrefixIndex {
  private readonly byPrefix = new Map<string, Set<string>>();
  private readonly tokensByDoc = new Map<string, Set<string>>();

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos (NFD separa a letra do diacrítico)
      .toLocaleLowerCase('pt-BR');
  }

  private tokenize(text: string): string[] {
    return this.normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 0);
  }

  add(document: SearchDocument): void {
    this.remove(document.id);
    const tokens = new Set(this.tokenize(document.text));
    if (tokens.size === 0) return;
    this.tokensByDoc.set(document.id, tokens);
    for (const token of tokens) {
      for (let length = 1; length <= token.length; length += 1) {
        const prefix = token.slice(0, length);
        const bucket = this.byPrefix.get(prefix);
        if (bucket) bucket.add(document.id);
        else this.byPrefix.set(prefix, new Set([document.id]));
      }
    }
  }

  remove(id: string): void {
    const tokens = this.tokensByDoc.get(id);
    if (!tokens) return;
    for (const token of tokens) {
      for (let length = 1; length <= token.length; length += 1) {
        this.byPrefix.get(token.slice(0, length))?.delete(id);
      }
    }
    this.tokensByDoc.delete(id);
  }

  /** Ids ordenados por quantos termos da query bateram como prefixo de
   *  algum token do documento — união, não interseção: "milho 8700" ainda
   *  acha o produto se só um dos dois termos casar, só que rankeado atrás
   *  de quem bateu nos dois. */
  search(query: string, limit = 20): string[] {
    const terms = this.tokenize(query);
    if (terms.length === 0) return [];
    const scores = new Map<string, number>();
    for (const term of terms) {
      const bucket = this.byPrefix.get(term);
      if (!bucket) continue;
      for (const id of bucket) scores.set(id, (scores.get(id) ?? 0) + 1);
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  get size(): number {
    return this.tokensByDoc.size;
  }
}
