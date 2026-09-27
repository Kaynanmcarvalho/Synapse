import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Divider } from './Divider';
import { IndiceOperacional } from './IndiceOperacional';
import { Surface } from './Surface';
import { Text } from './Text';

/** O contrato das foundations: o papel escolhe o elemento, a superficie nao
 *  vira cartao sozinha e o divisor se anuncia. Classe de cor nao e testada —
 *  isso e tema, e muda sem quebrar contrato. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('Text', () => {
  it('o papel escolhe o elemento semântico', () => {
    montar(<Text variant="tituloTela">Fornecedores</Text>);
    expect(caixa.querySelector('h1')?.textContent).toBe('Fornecedores');
  });

  it('`as` troca o elemento sem perder o papel', () => {
    montar(
      <Text variant="tituloTela" as="h2">
        Fornecedores
      </Text>,
    );
    expect(caixa.querySelector('h1')).toBeNull();
    expect(caixa.querySelector('h2')?.className).toContain('text-heading-md');
  });

  it('dado usa a família de números', () => {
    montar(<Text variant="dado">1.234,56</Text>);
    expect((caixa.firstElementChild as HTMLElement).className).toContain('font-data');
  });

  it('o tom muda a cor sem apagar o tamanho', () => {
    montar(
      <Text variant="corpoSecundario" tone="perigo">
        Não foi possível salvar
      </Text>,
    );
    const classe = (caixa.firstElementChild as HTMLElement).className;
    expect(classe).toContain('text-body-sm');
    expect(classe).toContain('text-status-perigo');
  });
});

describe('Surface', () => {
  it('não é card: não injeta espaçamento interno', () => {
    montar(<Surface>conteúdo</Surface>);
    const classe = (caixa.firstElementChild as HTMLElement).className;
    expect(classe).toContain('bg-surface-painel');
    expect(classe).not.toMatch(/(^|\s)p-\d/);
  });

  it('a página é superfície contínua, sem borda nem raio', () => {
    montar(<Surface variant="pagina">conteúdo</Surface>);
    const classe = (caixa.firstElementChild as HTMLElement).className;
    expect(classe).not.toContain('border');
    expect(classe).not.toContain('rounded');
  });

  it('o consumidor ajusta sem brigar com o estilo de dentro', () => {
    montar(<Surface className="rounded-controle">conteúdo</Surface>);
    const classe = (caixa.firstElementChild as HTMLElement).className;
    expect(classe).toContain('rounded-controle');
    expect(classe).not.toContain('rounded-painel');
  });

  it('tela (Fase 4.2) é o chão do aplicativo — um tom diferente de pagina, também sem borda nem raio', () => {
    montar(<Surface variant="tela">conteúdo</Surface>);
    const classe = (caixa.firstElementChild as HTMLElement).className;
    expect(classe).toContain('bg-surface-tela');
    expect(classe).not.toContain('bg-surface-pagina');
    expect(classe).not.toContain('border');
  });
});

describe('IndiceOperacional (Fase 4.2)', () => {
  it('completa com zero à esquerda e some do leitor de tela — é decorativo', () => {
    montar(<IndiceOperacional posicao={3} />);
    const span = caixa.firstElementChild as HTMLElement;
    expect(span.textContent).toBe('03');
    expect(span.getAttribute('aria-hidden')).toBe('true');
  });

  it('sem destaque fica em cobalto discreto (contraste ~4,7:1); com destaque, cobalto cheio', () => {
    montar(<IndiceOperacional posicao={1} />);
    expect((caixa.firstElementChild as HTMLElement).className).toContain('text-primary/90');

    montar(<IndiceOperacional posicao={1} destaque />);
    const classe = (caixa.firstElementChild as HTMLElement).className;
    expect(classe).toContain('text-primary');
    expect(classe).not.toContain('text-primary/90');
  });
});

describe('Divider', () => {
  it('se anuncia com orientação', () => {
    montar(<Divider orientation="vertical" />);
    const linha = caixa.firstElementChild as HTMLElement;
    expect(linha.getAttribute('role')).toBe('separator');
    expect(linha.getAttribute('aria-orientation')).toBe('vertical');
  });
});
