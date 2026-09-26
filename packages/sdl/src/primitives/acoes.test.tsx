import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Kbd } from './Kbd';
import { Spinner } from './Spinner';
import { Status } from './Status';

/** O contrato das acoes e do estado: botao que nao dispara desabilitado, botao
 *  de icone que tem nome, e situacao que nao vira pilula colorida por padrao. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const botao = () => caixa.querySelector('button') as HTMLButtonElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('Button', () => {
  it('não dispara quando desabilitado', () => {
    const aoClicar = vi.fn();
    montar(
      <Button disabled onClick={aoClicar}>
        Salvar
      </Button>,
    );
    act(() => botao().click());
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('carregando se anuncia e bloqueia o segundo clique', () => {
    const aoClicar = vi.fn();
    montar(
      <Button loading onClick={aoClicar}>
        Salvando…
      </Button>,
    );
    expect(botao().getAttribute('aria-busy')).toBe('true');
    expect(botao().disabled).toBe(true);
    act(() => botao().click());
    expect(aoClicar).not.toHaveBeenCalled();
    // A espera dentro do botao e decorativa: o texto ja diz o que acontece.
    expect(caixa.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('nasce como type=button para não enviar formulário sem querer', () => {
    montar(<Button>Novo</Button>);
    expect(botao().type).toBe('button');
  });

  it('tem quatro hierarquias, e a altura vem da densidade', () => {
    montar(
      <Button variant="primary" density="compacta">
        Liberar
      </Button>,
    );
    expect(botao().className).toContain('h-controle-compacta');
    expect(botao().className).toContain('bg-primary');
  });
});

describe('IconButton', () => {
  it('exige e aplica nome acessível', () => {
    montar(
      <IconButton label="Renomear">
        <svg />
      </IconButton>,
    );
    expect(botao().getAttribute('aria-label')).toBe('Renomear');
  });

  it('não é um círculo por padrão', () => {
    montar(
      <IconButton label="Fechar">
        <svg />
      </IconButton>,
    );
    expect(botao().className).toContain('rounded-controle');
    expect(botao().className).not.toContain('rounded-full');
  });

  it('o círculo existe quando a semântica pede', () => {
    montar(
      <IconButton label="Perfil" shape="circle">
        <svg />
      </IconButton>,
    );
    expect(botao().className).toContain('rounded-full');
  });
});

describe('Status', () => {
  it('por padrão é ponto e texto, não pílula colorida', () => {
    montar(<Status tone="ok">Ativo</Status>);
    const selo = caixa.firstElementChild as HTMLElement;
    expect(selo.textContent).toBe('Ativo');
    expect(selo.className).not.toContain('bg-status-ok-fundo');
    expect(selo.querySelector('[aria-hidden="true"]')?.className).toContain(
      'bg-status-ok-indicador',
    );
  });

  it('o chip existe para quando a situação precisa saltar', () => {
    montar(
      <Status tone="perigo" variant="chip">
        Bloqueado
      </Status>,
    );
    expect((caixa.firstElementChild as HTMLElement).className).toContain('bg-status-perigo-fundo');
  });
});

describe('Kbd e Spinner', () => {
  it('a tecla renderiza o conteúdo num <kbd>', () => {
    montar(<Kbd>Ctrl+K</Kbd>);
    expect(caixa.querySelector('kbd')?.textContent).toBe('Ctrl+K');
  });

  it('o spinner sozinho se anuncia como estado', () => {
    montar(<Spinner label="Carregando tabela" />);
    const svg = caixa.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('role')).toBe('status');
    expect(svg.getAttribute('aria-label')).toBe('Carregando tabela');
  });

  it('o spinner decorativo some para o leitor de tela', () => {
    montar(<Spinner decorative />);
    const svg = caixa.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });
});
