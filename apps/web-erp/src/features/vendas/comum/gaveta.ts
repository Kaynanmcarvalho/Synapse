/** F4 Acionar Gaveta: manda o pulso ESC/POS (ESC p 0 25 250) para a impressora
 *  não fiscal onde a gaveta está ligada, pela Web Serial do Chrome/Edge. A porta
 *  escolhida na primeira vez fica lembrada pelo navegador. */

interface PortaSerial {
  readonly writable: WritableStream<Uint8Array> | null;
  open(opcoes: { readonly baudRate: number }): Promise<void>;
  close(): Promise<void>;
  forget?(): Promise<void>;
}

interface SerialDoNavegador {
  getPorts(): Promise<PortaSerial[]>;
  requestPort(): Promise<PortaSerial>;
}

const PULSO = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);

const serial = (): SerialDoNavegador | undefined =>
  (navigator as unknown as { readonly serial?: SerialDoNavegador }).serial;

export const gavetaSuportada = (): boolean => Boolean(serial());

const SEM_SUPORTE =
  'Este navegador não fala com a impressora da gaveta. Use o Chrome ou o Edge no computador do caixa.';

const abrir = async (porta: PortaSerial) => {
  try {
    await porta.open({ baudRate: 9600 });
  } catch (falha: unknown) {
    // Já aberta por outro acionamento: segue.
    if (!(falha instanceof DOMException && falha.name === 'InvalidStateError')) throw falha;
  }
};

export const acionarGaveta = async (): Promise<void> => {
  const api = serial();
  if (!api) throw new Error(SEM_SUPORTE);
  const [lembrada] = await api.getPorts();
  const porta = lembrada ?? (await api.requestPort());
  await abrir(porta);
  const escritor = porta.writable?.getWriter();
  if (!escritor) throw new Error('A porta da impressora não aceitou o comando da gaveta');
  try {
    await escritor.write(PULSO);
  } finally {
    escritor.releaseLock();
    await porta.close().catch(() => undefined);
  }
};

/** Abre a gaveta sozinha no fim da venda em dinheiro, só se a impressora já foi
 *  escolhida antes: sem clique não dá para pedir a porta. */
export const abrirGavetaSeLembrada = async (): Promise<boolean> => {
  const api = serial();
  if (!api || (await api.getPorts()).length === 0) return false;
  await acionarGaveta();
  return true;
};

/** Esquece a porta lembrada e pede outra (troca de impressora). */
export const trocarPortaDaGaveta = async (): Promise<void> => {
  const api = serial();
  if (!api) throw new Error(SEM_SUPORTE);
  for (const porta of await api.getPorts()) await porta.forget?.();
  await api.requestPort();
};
