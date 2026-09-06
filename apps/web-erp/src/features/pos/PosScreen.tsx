import { useEffect, useRef, useState } from 'react';

type Line = { code: string; description: string; quantity: number; price: number };
const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

/** Fluxo keyboard-first: o leitor de código de barras funciona como teclado e envia Enter. */
export function PosScreen() {
  const input = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [customerTaxId, setCustomerTaxId] = useState('');
  useEffect(() => input.current?.focus(), []);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const add = () => {
    if (!code.trim()) return;
    setLines((old) => [
      ...old,
      { code, description: `Produto ${code}`, quantity: 1, price: 1_000 },
    ]);
    setCode('');
  };
  const keyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'F2') {
      event.preventDefault();
      input.current?.focus();
    }
    if (event.key === 'F9') {
      event.preventDefault();
      document.getElementById('cpf-cnpj')?.focus();
    }
  };
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100" onKeyDown={keyDown}>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">PDV / Caixa</h1>
        <span>F2 Produto · F9 CPF/CNPJ · F10 Pagamento</span>
      </header>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label htmlFor="barcode">Código, código de barras ou nome</label>
            <input
              ref={input}
              id="barcode"
              className="mt-2 w-full rounded bg-white p-4 text-xl text-slate-950"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </form>
          <table className="mt-5 w-full">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd.</th>
                <th>Preço</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.code}-${index}`}>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{money(line.price)}</td>
                  <td>{money(line.quantity * line.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="rounded bg-slate-900 p-6">
          <p className="text-sm">TOTAL</p>
          <strong className="text-5xl text-emerald-400">{money(total)}</strong>
          <label className="mt-8 block" htmlFor="cpf-cnpj">
            CPF/CNPJ na nota
          </label>
          <input
            id="cpf-cnpj"
            className="mt-2 w-full rounded bg-white p-3 text-slate-950"
            value={customerTaxId}
            onChange={(e) => setCustomerTaxId(e.target.value.replace(/\D/g, ''))}
          />
          <p className="mt-8 text-sm text-slate-400">
            Pagamento misto: dinheiro, PIX, débito, crédito, boleto, prazo ou carteira.
          </p>
        </aside>
      </div>
    </main>
  );
}
