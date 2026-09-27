import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Input } from './Input';
import { Select } from './Select';

/** O contrato do campo: rotulo ligado ao controle, aviso que descreve, estado
 *  que desce do Field para dentro. E o que a tela deixa de ter que lembrar. */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
const montar = (conteudo: React.ReactNode) => act(() => raiz.render(conteudo));
const input = () => caixa.querySelector('input') as HTMLInputElement;

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});

afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('Field', () => {
  it('liga o rótulo ao controle que está dentro dele', () => {
    montar(
      <Field label="Nome fantasia">
        <Input />
      </Field>,
    );
    const rotulo = caixa.querySelector('label') as HTMLLabelElement;
    expect(rotulo.textContent).toBe('Nome fantasia');
    expect(rotulo.htmlFor).toBe(input().id);
    expect(input().id).not.toBe('');
  });

  it('a dica descreve o campo para o leitor de tela', () => {
    montar(
      <Field label="CEP" hint="Só números">
        <Input />
      </Field>,
    );
    const descricao = input().getAttribute('aria-describedby');
    expect(descricao).toBeTruthy();
    expect(caixa.querySelector(`#${descricao}`)?.textContent).toBe('Só números');
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('o erro marca o campo como inválido e passa a descrevê-lo no lugar da dica', () => {
    montar(
      <Field label="CNPJ" hint="Só números" error="CNPJ inválido">
        <Input />
      </Field>,
    );
    expect(input().getAttribute('aria-invalid')).toBe('true');
    const descricao = input().getAttribute('aria-describedby');
    expect(caixa.querySelector(`#${descricao}`)?.textContent).toBe('CNPJ inválido');
    expect(caixa.textContent).not.toContain('Só números');
  });

  it('desabilitado e obrigatório descem do campo para o controle', () => {
    montar(
      <Field label="Praça" disabled required>
        <Input />
      </Field>,
    );
    expect(input().disabled).toBe(true);
    expect(input().getAttribute('aria-required')).toBe('true');
  });

  it('obrigatório ganha uma marca discreta no rótulo, não um asterisco vermelho', () => {
    montar(
      <Field label="Praça" required>
        <Input />
      </Field>,
    );
    const marca = caixa.querySelector('label span');
    expect(marca?.textContent).toBe('*');
    expect(marca?.getAttribute('aria-hidden')).toBe('true');
    expect(marca?.className).not.toContain('perigo');
  });

  it('sem required, o rótulo não ganha marca nenhuma', () => {
    montar(
      <Field label="Praça">
        <Input />
      </Field>,
    );
    expect(caixa.querySelector('label span')).toBeNull();
  });

  it('a densidade do campo vale para o controle sem a tela repetir', () => {
    montar(
      <Field label="Código" density="compacta">
        <Input />
      </Field>,
    );
    expect(input().className).toContain('h-controle-compacta');
  });
});

describe('Input', () => {
  it('preserva a ref', () => {
    const ref = createRef<HTMLInputElement>();
    montar(<Input ref={ref} defaultValue="abc" />);
    expect(ref.current).toBe(input());
    expect(ref.current?.value).toBe('abc');
  });

  it('funciona fora de um Field', () => {
    montar(<Input aria-label="Busca" />);
    expect(input().getAttribute('aria-label')).toBe('Busca');
    expect(input().getAttribute('aria-invalid')).toBeNull();
  });

  it('mantém o tamanho do texto do sistema ao lado da cor', () => {
    montar(<Input />);
    expect(input().className).toContain('text-body-sm');
    expect(input().className).toContain('text-ink');
  });

  it('alinhado à direita usa algarismo de largura fixa', () => {
    montar(<Input align="right" />);
    expect(input().className).toContain('font-data');
    expect(input().className).toContain('text-right');
  });
});

describe('Select', () => {
  it('associa o rótulo e mantém as opções nativas', () => {
    montar(
      <Field label="No caixa">
        <Select defaultValue="pix">
          <option value="pix">PIX</option>
          <option value="dinheiro">Dinheiro</option>
        </Select>
      </Field>,
    );
    const select = caixa.querySelector('select') as HTMLSelectElement;
    const rotulo = caixa.querySelector('label') as HTMLLabelElement;
    expect(rotulo.htmlFor).toBe(select.id);
    expect(select.options).toHaveLength(2);
    expect(select.value).toBe('pix');
  });

  it('a seta é decorativa', () => {
    montar(
      <Select aria-label="Situação">
        <option value="a">A</option>
      </Select>,
    );
    expect(caixa.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
