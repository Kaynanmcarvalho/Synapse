import { PrefixIndex } from './prefix-index';

describe('PrefixIndex', () => {
  it('acha um documento pelo prefixo de uma palavra', () => {
    const index = new PrefixIndex();
    index.add({ id: 'p1', text: 'Semente de Milho AG 8700' });
    expect(index.search('mil')).toEqual(['p1']);
    expect(index.search('milho')).toEqual(['p1']);
    expect(index.search('8700')).toEqual(['p1']);
  });

  it('não acha por um trecho no meio da palavra, só por prefixo', () => {
    const index = new PrefixIndex();
    index.add({ id: 'p1', text: 'Fertilizante NPK' });
    expect(index.search('tilizante')).toEqual([]);
    expect(index.search('fer')).toEqual(['p1']);
  });

  it('ignora acentuação e caixa', () => {
    const index = new PrefixIndex();
    index.add({ id: 'p1', text: 'Ração Premium' });
    expect(index.search('racao')).toEqual(['p1']);
    expect(index.search('RAÇÃO')).toEqual(['p1']);
    expect(index.search('prem')).toEqual(['p1']);
  });

  it('rankeia por quantidade de termos batidos, em vez de exigir todos', () => {
    const index = new PrefixIndex();
    index.add({ id: 'milho-8700', text: 'Semente de Milho AG 8700' });
    index.add({ id: 'milho-outro', text: 'Semente de Milho DKB 390' });
    const result = index.search('milho 8700');
    expect(result[0]).toBe('milho-8700'); // bateu nos dois termos
    expect(result).toContain('milho-outro'); // bateu só em "milho", mas ainda aparece
  });

  it('remove um documento do índice', () => {
    const index = new PrefixIndex();
    index.add({ id: 'p1', text: 'Produto Um' });
    index.remove('p1');
    expect(index.search('produto')).toEqual([]);
    expect(index.size).toBe(0);
  });

  it('reindexar o mesmo id substitui, não duplica', () => {
    const index = new PrefixIndex();
    index.add({ id: 'p1', text: 'Nome Antigo' });
    index.add({ id: 'p1', text: 'Nome Novo' });
    expect(index.search('antigo')).toEqual([]);
    expect(index.search('novo')).toEqual(['p1']);
    expect(index.size).toBe(1);
  });

  it('query vazia não devolve nada', () => {
    const index = new PrefixIndex();
    index.add({ id: 'p1', text: 'Produto' });
    expect(index.search('   ')).toEqual([]);
  });

  it('respeita o limite de resultados', () => {
    const index = new PrefixIndex();
    for (let i = 0; i < 30; i += 1) index.add({ id: `p${i}`, text: `Produto ${i}` });
    expect(index.search('produto', 5)).toHaveLength(5);
  });
});
