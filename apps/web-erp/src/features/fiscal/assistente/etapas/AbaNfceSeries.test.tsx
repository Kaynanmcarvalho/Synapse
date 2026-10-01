import type { NfceSeriesAssignment, NfceSettings } from '@synapse/types';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formularioPadrao, segredosGravados, segredosVazios } from '../assistente.padrao';
import { listarPendencias } from '../assistente.pendencias';
import { AbaNfceSeries } from './AbaNfceSeries';

/** Fase 7.5 — séries da NFC-e como coleção tabular de campos. O formulário
 *  pai é a fonte de verdade: o teste monta um pai mínimo com o mesmo
 *  `mudar` (merge raso em `nfce`) que `EtapaNfce` usa. */

vi.mock('../../../../lib/dev-auth', () => ({ identificadorDoDispositivo: () => 'disp-teste' }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root;
let caixa: HTMLDivElement;
let atual: NfceSettings;

const linha = (p: Partial<NfceSeriesAssignment>): NfceSeriesAssignment => ({
  id: p.id ?? `id-${p.identifier}`,
  identifier: '',
  system: 'RETAGUARDA',
  name: '',
  series: 1,
  nextNumber: 1,
  ...p,
});

function Pai({ inicial }: { readonly inicial: NfceSettings }) {
  const [nfce, setNfce] = useState(inicial);
  atual = nfce;
  return <AbaNfceSeries nfce={nfce} mudar={(parcial) => setNfce((n) => ({ ...n, ...parcial }))} />;
}

const montar = (series: NfceSeriesAssignment[], seriesMode: 'TERMINAL' | 'USER' = 'USER') =>
  act(() => raiz.render(<Pai inicial={{ ...formularioPadrao().nfce, seriesMode, series }} />));

const campo = (rotulo: string) =>
  caixa.querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${rotulo}"]`);
const digitar = (el: HTMLInputElement | HTMLSelectElement | null, valor: string) =>
  act(() => {
    if (!el) throw new Error('campo não encontrado');
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value')?.set?.call(el, valor);
    el.dispatchEvent(
      new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }),
    );
  });
const sair = (el: Element | null) => act(() => (el as HTMLElement | null)?.blur());
const botao = (rotulo: string) =>
  [...caixa.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') === rotulo || b.textContent?.trim() === rotulo,
  );

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

describe('AbaNfceSeries — coleção tabular de campos', () => {
  it('adicionar acrescenta no fim, com os padrões de antes, e põe o foco no identificador novo', () => {
    montar([linha({ identifier: 'a@x.com' })]);
    act(() => botao('Adicionar linha')?.click());
    expect(atual.series).toHaveLength(2);
    expect(atual.series[1]).toMatchObject({
      identifier: '',
      system: 'RETAGUARDA',
      name: '',
      series: 1,
      nextNumber: 1,
    });
    expect(document.activeElement).toBe(campo('E-mail do usuário da linha 2'));
  });

  it('editar escreve direto no formulário pai, com o mesmo parse e teto de antes', () => {
    montar([linha({ identifier: 'a@x.com' })]);
    digitar(campo('E-mail do usuário da linha 1'), '  b@x.com ');
    digitar(campo('Sistema da linha 1'), 'PDV');
    digitar(campo('Série da linha 1'), '12a34');
    digitar(campo('Próximo número da linha 1'), '9999999999');
    expect(atual.series[0]).toMatchObject({
      identifier: 'b@x.com',
      system: 'PDV',
      series: 999,
      nextNumber: 999_999_999,
    });
  });

  it('remover tira na hora (sem confirmação) e o foco vai para a linha que ocupou o lugar', () => {
    montar([linha({ identifier: 'a' }), linha({ identifier: 'b' }), linha({ identifier: 'c' })]);
    act(() => botao('Remover linha 2 (b)')?.click());
    expect(atual.series.map((l) => l.identifier)).toEqual(['a', 'c']);
    expect((document.activeElement as HTMLInputElement).value).toBe('c');
  });

  it('remover a última linha leva o foco para "Adicionar linha" e mostra o vazio', () => {
    montar([linha({ identifier: 'a' })]);
    act(() => botao('Remover linha 1 (a)')?.click());
    expect(atual.series).toEqual([]);
    expect(document.activeElement?.textContent?.trim()).toBe('Adicionar linha');
    expect(caixa.textContent).toContain('Nenhuma série cadastrada');
  });

  it('keys estáveis: remover a primeira não mistura o que estava digitado nas outras', () => {
    montar([
      linha({ id: '1', identifier: 'a' }),
      linha({ id: '2', identifier: 'b', name: 'Caixa B' }),
    ]);
    const nomeDaB = campo('Nome da linha 2');
    act(() => botao('Remover linha 1 (a)')?.click());
    expect(campo('Nome da linha 1')).toBe(nomeDaB);
    expect((campo('Nome da linha 1') as HTMLInputElement).value).toBe('Caixa B');
  });

  it('célula vazia só fica inválida depois que a pessoa sai dela', () => {
    montar([]);
    act(() => botao('Adicionar linha')?.click());
    const id = campo('E-mail do usuário da linha 1');
    expect(id?.getAttribute('aria-invalid')).toBeNull();
    sair(id);
    expect(id?.getAttribute('aria-invalid')).toBe('true');
  });

  it('identificador repetido marca as duas linhas na hora, com a mesma regra que bloqueia o F8', () => {
    montar([linha({ id: '1', identifier: 'a' }), linha({ id: '2', identifier: 'a' })]);
    for (const n of [1, 2])
      expect(campo(`E-mail do usuário da linha ${n}`)?.getAttribute('aria-invalid')).toBe('true');
    expect(caixa.textContent).toContain('Este usuário aparece em mais de uma linha.');
    const pendencias = listarPendencias(
      { ...formularioPadrao(), nfce: atual },
      segredosVazios(),
      segredosGravados(null),
    );
    expect(pendencias.some((p) => p.aba === 'series' && p.bloqueia)).toBe(true);
  });

  it('Tab segue a ordem natural da linha e não fica preso na grade', () => {
    montar([linha({ identifier: 'a' })]);
    const ordem = [...caixa.querySelectorAll('table input, table select, table button')].map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(ordem).toEqual([
      'E-mail do usuário da linha 1',
      'Sistema da linha 1',
      'Nome da linha 1',
      'Série da linha 1',
      'Próximo número da linha 1',
      'Remover linha 1 (a)',
    ]);
    expect(caixa.querySelector('[tabindex="-1"], [role="grid"]')).toBeNull();
  });
});
