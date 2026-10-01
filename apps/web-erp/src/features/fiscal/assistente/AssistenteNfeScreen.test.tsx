import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type * as RouterDom from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Fase 8 — o workflow inteiro do assistente fiscal: navegação (trilho, F6,
 *  F7), F8 com pendência (abre a etapa, mostra no campo, não chama a API),
 *  salvar com o payload de sempre, erro do servidor, Esc com alterações e a
 *  falha de carga sem formulário de valores padrão. Nada vai à SEFAZ. */

vi.mock('./assistente.api', () => ({
  carregarConfigFiscal: vi.fn(),
  salvarConfigFiscal: vi.fn(),
  buscarCep: vi.fn(),
  lerArquivoComoBase64: vi.fn(),
}));
vi.mock('../../../lib/dev-auth', () => ({ identificadorDoDispositivo: () => 'disp-teste' }));
const navegar = vi.fn();
vi.mock('react-router-dom', async (original) => ({
  ...(await original<typeof RouterDom>()),
  useNavigate: () => navegar,
}));

const api = await import('./assistente.api');
const { AssistenteNfeScreen } = await import('./AssistenteNfeScreen');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom não rola: a área de trabalho volta ao topo ao trocar de etapa.
Element.prototype.scrollTo = () => undefined;
Element.prototype.scrollIntoView = () => undefined;

let raiz: Root;
let caixa: HTMLDivElement;

const montar = async () => {
  await act(async () =>
    raiz.render(
      <MemoryRouter>
        <AssistenteNfeScreen />
      </MemoryRouter>,
    ),
  );
};
const tecla = (key: string) =>
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
const etapaAtual = () => document.getElementById('titulo-da-etapa')?.textContent;
const campo = (rotulo: string) =>
  [...document.querySelectorAll('label')].find((l) => l.textContent === rotulo)?.control as
    HTMLInputElement | undefined;
const digitar = (el: HTMLInputElement | undefined, valor: string) =>
  act(() => {
    if (!el) throw new Error('campo não encontrado');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  vi.mocked(api.carregarConfigFiscal).mockResolvedValue({ companyId: 'c1', config: null } as never);
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
  vi.clearAllMocks();
});

describe('Assistente fiscal — workflow', () => {
  it('trilho, F7 e F6 navegam entre as etapas sem travar', async () => {
    await montar();
    expect(etapaAtual()).toBe('Parâmetros da Empresa');
    tecla('F7');
    expect(etapaAtual()).toBe('Nota Fiscal Eletrônica');
    tecla('F6');
    expect(etapaAtual()).toBe('Parâmetros da Empresa');
    const nfce = [...document.querySelectorAll('nav[aria-label="Etapas do assistente"] button')][3];
    act(() => (nfce as HTMLButtonElement).click());
    expect(etapaAtual()).toBe('NFC-e');
  });

  it('F8 com pendência bloqueante: não chama a API, abre a etapa e mostra o erro no campo', async () => {
    await montar();
    digitar(campo('CNPJ'), '11222333000100');
    tecla('F7');
    tecla('F8');
    await act(async () => undefined);
    expect(api.salvarConfigFiscal).not.toHaveBeenCalled();
    expect(etapaAtual()).toBe('Parâmetros da Empresa');
    const cnpj = campo('CNPJ');
    expect(cnpj?.getAttribute('aria-invalid')).toBe('true');
    expect(cnpj?.closest('[data-campo]')?.textContent).toContain('CNPJ do emitente inválido.');
    // A mesma mensagem não se repete na faixa da etapa.
    const faixa = document.querySelector('[aria-label="Pendências desta etapa"]');
    expect(faixa?.textContent).not.toContain('CNPJ do emitente inválido.');
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Não foi salvo');
  });

  it('antes do F8 o formulário não nasce vermelho; a faixa da etapa lista o que falta', async () => {
    await montar();
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
    expect(document.querySelector('[aria-label="Pendências desta etapa"]')?.textContent).toContain(
      'Informe a inscrição estadual (ou ISENTO).',
    );
  });

  it('erro do servidor aparece uma vez e mantém o formulário', async () => {
    vi.mocked(api.salvarConfigFiscal).mockRejectedValue(new Error('Falha do servidor'));
    await montar();
    digitar(campo('CNPJ'), '11222333000181');
    digitar(campo('Inscrição estadual'), 'ISENTO');
    act(() => {
      const uf = campo('UF') as unknown as HTMLSelectElement;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(uf, 'GO');
      uf.dispatchEvent(new Event('change', { bubbles: true }));
    });
    tecla('F8');
    await act(async () => undefined);
    expect(api.salvarConfigFiscal).toHaveBeenCalledTimes(1);
    const corpo = vi.mocked(api.salvarConfigFiscal).mock.calls[0]?.[0];
    expect(corpo).toMatchObject({ stateRegistration: 'ISENTO', state: 'GO' });
    expect(corpo?.issuer.document).toBe('11222333000181');
    expect(
      [...document.querySelectorAll('[role="alert"]')].map((e) => e.textContent).join(),
    ).toContain('Falha do servidor');
    expect(campo('Inscrição estadual')?.value).toBe('ISENTO');
  });

  it('Esc com alteração pede para descartar; sem alteração, sai direto', async () => {
    await montar();
    tecla('Escape');
    expect(navegar).toHaveBeenCalledTimes(1);
    navegar.mockClear();
    digitar(campo('Razão social'), 'X');
    tecla('Escape');
    expect(navegar).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Descartar alterações?');
  });

  it('falha ao carregar não mostra formulário com valores padrão', async () => {
    vi.mocked(api.carregarConfigFiscal).mockRejectedValue(new Error('Sem conexão'));
    await montar();
    expect(document.body.textContent).toContain('Não foi possível abrir a configuração fiscal');
    expect(campo('Razão social')).toBeUndefined();
  });
});
